// app/api/attendance/supervisor/overview/route.js
import { NextResponse } from 'next/server';
import { getSQLServerConnection } from '@/lib/sqlserver';
import { connectToDatabase } from '@/lib/mongodb';

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
    const role = supervisor.role; // 'Commission', 'DepartmentHead', 'DivisionHead', 'Admin'

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
      // Admin sees all regular officers (adjust if needed)
      subordinates = await db.collection('users').find({
        role: 'Officer',
      }).toArray();
    }
    else if (role === 'Commission') {
      // Commission sees all Department Heads
      // If you don't have a separate 'DepartmentHead' role, use 'DivisionHead' instead
      subordinates = await db.collection('users').find({
        role: 'DepartmentHead'
      }).toArray();
      // Alternative if no DepartmentHead role:
      // subordinates = await db.collection('users').find({ role: 'DivisionHead' }).toArray();
    }
    else if (role === 'DepartmentHead') {
      // Department Head sees Division Heads under the same departmentId
      if (!supervisor.departmentId) {
        subordinates = [];
      } else {
        subordinates = await db.collection('users').find({
          role: 'DivisionHead',
          departmentId: supervisor.departmentId
        }).toArray();
      }
    }
    else if (role === 'DivisionHead') {
      // Division Head sees Officers under the same divisionId
      if (!supervisor.divisionId) {
        subordinates = [];
      } else {
        subordinates = await db.collection('users').find({
          role: 'Officer',
          divisionId: supervisor.divisionId
        }).toArray();
      }
    }
    else {
      return NextResponse.json({ error: 'Not authorized to view team attendance' }, { status: 403 });
    }

    if (!subordinates.length) {
      return NextResponse.json({ officers: [] });
    }

    // 5. For each subordinate, fetch attendance from SQL Server (unchanged)
    const pool = await getSQLServerConnection();
    const officersWithAttendance = [];

    for (const officer of subordinates) {
      const empCode = officer.cid;
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
        inColor = firstIn > '09:15' ? 'text-orange-600' : 'text-green-700';
      }
      if (outPunches.length) {
        lastOut = outPunches[outPunches.length - 1].pTime;
        outColor = lastOut < '17:00' ? 'text-orange-600' : 'text-green-700';
      }

      // Determine final status
      if (firstIn && lastOut) {
        if (firstIn > '09:15' && lastOut < '17:00') status = 'Late & Early';
        else if (firstIn > '09:15') status = 'Late arrival';
        else if (lastOut < '17:00') status = 'Early departure';
        else status = 'Present';
      } else if (firstIn && !lastOut) {
        status = 'Missing OUT';
      } else if (!firstIn && lastOut) {
        status = 'Missing IN';
      }

      officersWithAttendance.push({
        userId: officer._id.toString(),
        empCode: empCode,
        name: officer.name,
        division: officer.divisionName || officer.division || '-',
        department: officer.departmentName || officer.department || '-',
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