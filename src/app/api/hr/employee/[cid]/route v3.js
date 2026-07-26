import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee } from '@/models/Employee';

// ---------- GET (existing) ----------
const TOKEN_URL = process.env.HR_TOKEN_URL;
const EMPLOYEE_API_URL = process.env.HR_EMPLOYEE_API_URL;
const CLIENT_ID = process.env.HR_CLIENT_ID;
const CLIENT_SECRET = process.env.HR_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
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

export async function GET(request, { params }) {
  try {
    const { cid } = await params;
    if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 });
    const token = await getAccessToken();
    const baseUrl = EMPLOYEE_API_URL.endsWith('/') ? EMPLOYEE_API_URL.slice(0, -1) : EMPLOYEE_API_URL;
    const externalUrl = `${baseUrl}/${cid}`;
    const response = await fetch(externalUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 404) {
      return NextResponse.json({ error: 'Employee not found with this CID' }, { status: 404 });
    }
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `HR API error: ${response.status}` }, { status: response.status });
    }
    const rawData = await response.json();
    const employee = rawData?.employeeDetails?.employeeDetail?.[0] ||
                     rawData?.employeedetails?.employeedetail?.[0];
    if (!employee) {
      return NextResponse.json({ error: 'Employee data not found' }, { status: 404 });
    }
    const mappedEmployee = {
      fullName: `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim(),
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      cidNumber: employee.cidNumber || '',
      employeeNumber: employee.employeeNumber || '',
      positionTitle: employee.positionTitle || '',
      positionLevel: employee.positionLevel || '',
      subLevel: employee.subLevel || '',
      agency: employee.agencyName || '',
      mainWorkingAgency: employee.mainWorkingAgency || '',
      department: employee.OrganogramLevel2 || '',
      division: employee.OrganogramLevel3 || '',
      email: employee.Email || '',
      mobile: employee.MobileNo || '',
      dateOfBirth: employee.dateOfBirth || '',
      dateOfAppointment: employee.dateOfAppointment || '',
      lastDateOfPromotion: employee.lastDateOfPromotion || '',
      empType: employee.empType || '',
      fullAgencyPath: employee.FullWorkingAgency || '',
    };
    return NextResponse.json(mappedEmployee);
  } catch (error) {
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 });
  }
}

// ---------- PUT – update custom fields ----------
export async function PUT(request, { params }) {
  try {
    const { cid } = await params;
    if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 });

    await connectToDatabase();
    const body = await request.json();

    const allowedUpdates = {
      gender: body.gender,
      parentAgency: body.parentAgency,
      mog: body.mog,
      subGroup: body.subGroup,
      superStructure: body.superStructure,
      positionType: body.positionType,
      degree: body.degree,                        // ✅ NEW
      qualification: body.qualification,
      remarks: body.remarks,
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
    });

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await Employee.findOneAndUpdate(
      { cidNumber: cid },
      { $set: allowedUpdates, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}