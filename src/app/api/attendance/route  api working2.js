// app/api/attendance/route.js
import { NextResponse } from 'next/server';
import { getSQLServerConnection } from '@/lib/sqlserver';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // 1. Fetch user profile to get the actual employee code
    const profileRes = await fetch(`${process.env.APP_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 401 });
    }
    const profile = await profileRes.json();

    // 2. Extract the employee code – adjust field name based on your profile schema
    const empCode = profile.cid || profile.employeeCode || profile.empCode;
    if (!empCode) {
      return NextResponse.json({ error: 'Employee code not found in profile' }, { status: 400 });
    }

    console.log('Employee code for biometric query:', empCode);

    // 3. Number of days (default 5)
    const { searchParams } = new URL(request.url);
    const daysLimit = parseInt(searchParams.get('days') || '5');

    // 4. Date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysLimit + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');

    // 5. Query SQL Server
    const pool = await getSQLServerConnection();
    const result = await pool.request()
      .input('empCode', empCode)
      .input('startDate', startDateStr)
      .input('endDate', endDateStr)
      .query(`
        SELECT PunchDateTime, InOut
        FROM expTrans
        WHERE EmpCode = @empCode
          AND PunchDateTime BETWEEN @startDate AND @endDate
        ORDER BY PunchDateTime ASC
      `);

    const punches = result.recordset;

    // 6. Group punches by date
    const punchesByDate = {};
    for (const punch of punches) {
      const dateStr = punch.PunchDateTime.toISOString().split('T')[0];
      if (!punchesByDate[dateStr]) punchesByDate[dateStr] = [];
      punchesByDate[dateStr].push(new Date(punch.PunchDateTime));
    }

    // 7. Generate list of last N dates
    const dateList = [];
    for (let i = 0; i < daysLimit; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }
    dateList.reverse();

    // 8. Compute attendance
    const thresholds = { lateAfter: '09:15:59', earlyBefore: '17:00:59' };

    const attendanceSummary = dateList.map(date => {
      const times = punchesByDate[date] || [];
      if (times.length === 0) {
        return {
          date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          firstIn: null,
          lastOut: null,
          firstClass: '',
          lastClass: '',
          status: 'No punch',
        };
      }
      times.sort((a, b) => a - b);
      const firstIn = times[0];
      const lastOut = times[times.length - 1];
      const inTimeStr = firstIn.toLocaleTimeString('en-GB');
      const outTimeStr = lastOut.toLocaleTimeString('en-GB');

      let inColor = 'text-green-700';
      let outColor = 'text-green-700';
      let status = 'Present';

      if (inTimeStr > thresholds.lateAfter) {
        inColor = 'text-orange-600';
        status = 'Late arrival';
      }
      if (outTimeStr < thresholds.earlyBefore) {
        outColor = 'text-orange-600';
        status = status === 'Late arrival' ? 'Late & Early' : 'Early departure';
      }

      return {
        date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        firstIn: inTimeStr,
        lastOut: outTimeStr,
        firstClass: inColor,
        lastClass: outColor,
        status,
      };
    });

    return NextResponse.json({ attendance: attendanceSummary });
  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}