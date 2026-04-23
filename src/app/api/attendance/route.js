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

    const profileRes = await fetch(`${process.env.APP_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 401 });
    }
    const profile = await profileRes.json();
    const empCode = profile.cid;
    if (!empCode) {
      return NextResponse.json({ error: 'Employee code not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let startDateStr, endDateStr;
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const daysLimit = parseInt(searchParams.get('days') || '0');

    // Determine date range: either explicit start/end or last N days
    if (startParam && endParam) {
      startDateStr = startParam;
      endDateStr = endParam;
    } else if (daysLimit > 0) {
      // Last N days (default 5 from dashboard)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysLimit + 1);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
    } else {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    // Generate all dates between startDateStr and endDateStr (inclusive)
    const dateList = [];
    let current = new Date(startDateStr);
    const end = new Date(endDateStr);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }

    const pool = await getSQLServerConnection();

    const result = await pool.request()
      .input('empCode', empCode)
      .input('startDate', startDateStr)
      .input('endDate', endDateStr)
      .query(`
        SELECT 
          FORMAT(PunchDateTime, 'yyyy-MM-dd') AS pDate,
          FORMAT(PunchDateTime, 'HH:mm') AS pTime,
          InOut
        FROM expTrans
        WHERE EmpCode = @empCode
          AND CAST(PunchDateTime AS DATE) BETWEEN @startDate AND @endDate
        ORDER BY PunchDateTime ASC
      `);

    const rows = result.recordset;

    // Group by date – using the actual InOut values: 'In' and 'Out'
    const inByDate = {};
    const outByDate = {};
    for (const row of rows) {
      const dateStr = row.pDate;
      const timeStr = row.pTime;
      if (row.InOut === 'In') {
        if (!inByDate[dateStr]) inByDate[dateStr] = [];
        inByDate[dateStr].push(timeStr);
      } else if (row.InOut === 'Out') {
        if (!outByDate[dateStr]) outByDate[dateStr] = [];
        outByDate[dateStr].push(timeStr);
      }
    }

    const thresholds = { lateAfter: '09:15', earlyBefore: '17:00' };
    const attendanceSummary = dateList.map(date => {
      const inTimes = inByDate[date] || [];
      const outTimes = outByDate[date] || [];
      let firstIn = null, lastOut = null, status = 'No punch';
      if (inTimes.length) {
        inTimes.sort();
        firstIn = inTimes[0];
      }
      if (outTimes.length) {
        outTimes.sort();
        lastOut = outTimes[outTimes.length - 1];
      }
      if (firstIn && lastOut) status = 'Present';
      else if (firstIn && !lastOut) status = 'Missing OUT';
      else if (!firstIn && lastOut) status = 'Missing IN';

      let inColor = '', outColor = '';
      if (firstIn) {
        inColor = firstIn > thresholds.lateAfter ? 'text-orange-600' : 'text-green-700';
        if (firstIn > thresholds.lateAfter) status = 'Late arrival';
      }
      if (lastOut) {
        outColor = lastOut < thresholds.earlyBefore ? 'text-orange-600' : 'text-green-700';
        if (lastOut < thresholds.earlyBefore) {
          status = status === 'Late arrival' ? 'Late & Early' : 'Early departure';
        }
      }
      return {
        date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        firstIn,
        lastOut,
        firstClass: inColor,
        lastClass: outColor,
        status,
      };
    });

    return NextResponse.json({ attendance: attendanceSummary });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}