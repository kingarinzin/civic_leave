import { NextResponse } from 'next/server';

// ============================================
// READ FROM ENVIRONMENT VARIABLES
// ============================================
const TOKEN_URL = process.env.HR_TOKEN_URL;
const EMPLOYEE_API_URL = process.env.HR_EMPLOYEE_API_URL;
const CLIENT_ID = process.env.HR_CLIENT_ID;
const CLIENT_SECRET = process.env.HR_CLIENT_SECRET;

// ============================================
// TOKEN CACHE (in memory)
// ============================================
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  try {
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
    const expiresIn = data.expires_in || 3600;
    tokenExpiry = Date.now() + expiresIn * 1000;

    return cachedToken;
  } catch (error) {
    console.error('Failed to obtain access token:', error);
    throw new Error('Authentication with HR system failed');
  }
}

// ============================================
// GET Handler – dynamic route with awaited params
// ============================================
export async function GET(request, { params }) {
  try {
    const { cid } = await params;

    if (!cid || cid.trim().length === 0) {
      return NextResponse.json(
        { error: 'CID Number is required' },
        { status: 400 }
      );
    }

    const token = await getAccessToken();

    // Build the external API URL – ensure no double slashes
    const baseUrl = EMPLOYEE_API_URL.endsWith('/')
      ? EMPLOYEE_API_URL.slice(0, -1)
      : EMPLOYEE_API_URL;
    const externalUrl = `${baseUrl}/${cid}`;

    console.log(`📡 Calling external API: ${externalUrl}`);

    const response = await fetch(externalUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Handle 404 Not Found
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Employee not found with this CID' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HR API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `HR API error: ${response.status}` },
        { status: response.status }
      );
    }

    const rawData = await response.json();

    // Handle both possible key casings
    const employee =
      rawData?.employeeDetails?.employeeDetail?.[0] ||
      rawData?.employeedetails?.employeedetail?.[0];

    if (!employee) {
      console.error('❌ No employee data found in response');
      return NextResponse.json(
        { error: 'Employee data not found in response' },
        { status: 404 }
      );
    }

    // Map to clean frontend object
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

    console.log('✅ Employee data mapped successfully');
    return NextResponse.json(mappedEmployee);
  } catch (error) {
    console.error('❌ Error in HR employee API route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}