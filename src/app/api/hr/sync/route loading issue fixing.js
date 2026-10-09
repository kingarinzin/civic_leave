import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee } from '@/models/Employee';
import mongoose from 'mongoose';

// Environment variables
const TOKEN_URL = process.env.HR_TOKEN_URL;
const EMPLOYEE_API_URL = process.env.HR_EMPLOYEE_API_URL;
const CLIENT_ID = process.env.HR_CLIENT_ID;
const CLIENT_SECRET = process.env.HR_CLIENT_SECRET;

// Token cache
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token fetch failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export async function POST(req) {
  try {
    // Ensure DB connection is ready
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection not ready, state:', mongoose.connection.readyState);
      return NextResponse.json(
        { error: 'Database connection not ready' },
        { status: 503 }
      );
    }

    const { cids } = await req.json();
    if (!cids || !Array.isArray(cids) || cids.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of CIDs' },
        { status: 400 }
      );
    }

    const token = await getAccessToken();

    let synced = 0;
    let failed = [];

    for (const cid of cids) {
      try {
        const baseUrl = EMPLOYEE_API_URL.endsWith('/') ? EMPLOYEE_API_URL.slice(0, -1) : EMPLOYEE_API_URL;
        const url = `${baseUrl}/${cid}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const rawData = await response.json();
          const emp = rawData?.employeedetails?.employeedetail?.[0] ||
                      rawData?.employeeDetails?.employeeDetail?.[0];

          if (emp) {
            const employeeData = {
              fullName: `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
              firstName: emp.firstName || '',
              lastName: emp.lastName || '',
              cidNumber: emp.cidNumber || '',
              employeeNumber: emp.employeeNumber || '',
              positionTitle: emp.positionTitle || '',
              positionLevel: emp.positionLevel || '',
              subLevel: emp.subLevel || '',
              agency: emp.agencyName || '',
              mainWorkingAgency: emp.mainWorkingAgency || '',
              department: emp.OrganogramLevel2 || '',
              division: emp.OrganogramLevel3 || '',
              email: emp.Email || '',
              mobile: emp.MobileNo || '',
              dateOfBirth: emp.dateOfBirth || '',
              dateOfAppointment: emp.dateOfAppointment || '',
              lastDateOfPromotion: emp.lastDateOfPromotion || '',
              empType: emp.empType || '',
              fullAgencyPath: emp.FullWorkingAgency || '',
              lastUpdated: new Date(),
            };

            await Employee.findOneAndUpdate(
              { cidNumber: employeeData.cidNumber },
              employeeData,
              { upsert: true, new: true }
            );
            synced++;
          } else {
            failed.push(cid);
          }
        } else {
          failed.push(cid);
        }
      } catch (err) {
        console.error(`Failed to sync CID ${cid}:`, err);
        failed.push(cid);
      }
    }

    return NextResponse.json({
      message: `Sync completed: ${synced} synced, ${failed.length} failed`,
      synced,
      failed,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}