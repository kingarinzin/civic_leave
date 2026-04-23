// app/api/attendance/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSQLServerConnection } from '@/lib/sqlserver';

export async function GET(request) {
  try {
    // 1. Authenticate user via JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT:', decoded);  // <-- Add this line here
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Get employee code from JWT – adjust this based on your JWT payload
    // Common fields: cid, empCode, userId, id, employeeId
    const empCode = decoded.cid || decoded.empCode || decoded.userId || decoded.id;
    if (!empCode) {
      return NextResponse.json({ error: 'Employee code missing in token' }, { status: 400 });
    }

    // 3. Number of days (default 5)
    const { searchParams } = new URL(request.url);
    const daysLimit = parseInt(searchParams.get('days') || '5');

    // 4. Date range (last N days including today)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysLimit + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Format dates for SQL Server (YYYY-MM-DD HH:MM:SS)
    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');

    // 5. Query SQL Server `expTrans` table
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

    // 8. Compute attendance (same logic as PHP)
    const thresholds = { lateAfter: '09:15:59', earlyBefore: '17:00:59' };

    const attendanceSummary = dateList.map(date => {
      const times = punchesByDate[date] || [];
      if (times.length === 0) {
        return {
          date: new Date(date).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }),
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
        date: new Date(date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }),
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