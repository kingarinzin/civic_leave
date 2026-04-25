// app/api/attendance/supervisor/overview/route.js
import { NextResponse } from 'next/server';
import { getSQLServerConnection } from '@/lib/sqlserver';
import { connectToDatabase } from '@/lib/mongodb'; // 👈 your existing helper

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // 1. Fetch supervisor's profile
    const profileRes = await fetch(`${process.env.APP_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 401 });
    }
    const supervisor = await profileRes.json();
    const role = supervisor.role; // 'DivisionHead', 'DepartmentHead', 'Admin'

    // 2. Date from query (default today)
    const { searchParams } = new URL(request.url);
    let targetDate = searchParams.get('date');
    if (!targetDate) {
      targetDate = new Date().toISOString().split('T')[0];
    }

    // 3. Connect to MongoDB
    const { db } = await connectToDatabase();

    // 4. Find subordinates based on role
    let subordinates = [];
    if (role === 'Admin') {
      subordinates = await db.collection('users').find({
        isAdmin: { $ne: true },
        role: 'Officer',
      }).toArray();
    } else if (role === 'DivisionHead') {
      subordinates = await db.collection('users').find({
        divisionId: supervisor.divisionId,
        role: 'Officer',
      }).toArray();
    } else if (role === 'DepartmentHead') {
      subordinates = await db.collection('users').find({
        departmentId: supervisor.departmentId,
        role: 'Officer',
      }).toArray();
    } else {
      return NextResponse.json({ error: 'Not authorized to view team attendance' }, { status: 403 });
    }

    if (!subordinates.length) {
      return NextResponse.json({ officers: [] });
    }

    // 5. For each subordinate, fetch attendance from SQL Server
    const pool = await getSQLServerConnection();
    const officersWithAttendance = [];

    for (const officer of subordinates) {
      const empCode = officer.cid; // adjust field name if needed
      if (!empCode) continue;

      const sqlResult = await pool.request()
        .input('empCode', empCode)
        .input('targetDate', targetDate)
        .query(`
          SELECT 
            FORMAT(PunchDateTime, 'HH:mm') AS pTime,
            InOut
          FROM expTrans
          WHERE EmpCode = @empCode
            AND CAST(PunchDateTime AS DATE) = @targetDate
          ORDER BY PunchDateTime ASC
        `);

      const punches = sqlResult.recordset;
      let firstIn = null, lastOut = null, status = 'No punch';
      let inColor = '', outColor = '';

      const inPunches = punches.filter(p => p.InOut === 'In');
      const outPunches = punches.filter(p => p.InOut === 'Out');

      if (inPunches.length) {
        firstIn = inPunches[0].pTime;
        status = 'Late arrival';
        inColor = firstIn > '09:15' ? 'text-orange-600' : 'text-green-700';
      }
      if (outPunches.length) {
        lastOut = outPunches[outPunches.length - 1].pTime;
        outColor = lastOut < '17:00' ? 'text-orange-600' : 'text-green-700';
      }
      if (firstIn && lastOut) {
        if (firstIn > '09:15' && lastOut < '17:00') status = 'Late & Early';
        else if (firstIn > '09:15') status = 'Late arrival';
        else if (lastOut < '17:00') status = 'Early departure';
        else status = 'Present';
      }

      officersWithAttendance.push({
        userId: officer._id.toString(),
        name: officer.name,
        division: officer.divisionName || '-',
        department: officer.departmentName || '-',
        firstIn,
        lastOut,
        status,
        inColor,
        outColor,
      });
    }

    return NextResponse.json({ officers: officersWithAttendance });
  } catch (error) {
    console.error('Supervisor overview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}