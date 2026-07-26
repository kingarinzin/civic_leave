// app/api/attendance/route.js
import { NextResponse } from 'next/server';
import { getSQLServerConnection } from '@/lib/sqlserver';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper: get current user from token using the internal profile API
async function getCurrentUser(token) {
  const profileRes = await fetch(`${process.env.APP_URL}/api/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileRes.ok) {
    throw new Error('Failed to fetch profile');
  }
  return profileRes.json();
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // 1. Get the currently logged‑in user (requester)
    let currentUser;
    try {
      currentUser = await getCurrentUser(token);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empCodeParam = searchParams.get('empCode');
    const targetUserId = searchParams.get('userId');
    let targetEmpCode = null;
    let targetUser = null;
    let targetUserName = null;

    const { db } = await connectToDatabase();

    // 2. Identify the target user (the one whose attendance is requested)
    if (empCodeParam) {
      // Direct employee code lookup (fast path from supervisor overview)
      targetUser = await db.collection('users').findOne({ cid: empCodeParam });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetEmpCode = empCodeParam;
      targetUserName = targetUser.name;
    } else if (targetUserId) {
      // Lookup by MongoDB ObjectId
      if (!ObjectId.isValid(targetUserId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
      targetUser = await db.collection('users').findOne({ _id: new ObjectId(targetUserId) });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetEmpCode = targetUser.cid;
      targetUserName = targetUser.name;
    } else {
      // No parameter → view own attendance
      targetEmpCode = currentUser.cid;
      targetUser = currentUser;
      targetUserName = currentUser.name;
    }

    if (!targetEmpCode) {
      return NextResponse.json({ error: 'Employee code not found for target user' }, { status: 400 });
    }

    // 3. HIERARCHY AUTHORIZATION CHECK
    const currentRole = currentUser.role;
    const targetRole = targetUser.role;

    // Self check: compare MongoDB _id if available, else fallback to empCode
    const isSelf =
      (currentUser._id && targetUser._id && currentUser._id.toString() === targetUser._id.toString()) ||
      (currentUser.cid && currentUser.cid === targetEmpCode);

    let authorized = false;

    if (isSelf) {
      authorized = true;
    } else if (currentRole === 'Admin') {
      // Admin can see everyone
      authorized = true;
    } else if (currentRole === 'Commission') {
      // Commission can see any DepartmentHead (or DivisionHead if that acts as department head)
      if (targetRole === 'DepartmentHead' || targetRole === 'DivisionHead') {
        authorized = true;
      }
    } else if (currentRole === 'DepartmentHead') {
      // Department head can see officers under the same departmentId
      if (
        targetRole === 'Officer' &&
        targetUser.departmentId &&
        currentUser.departmentId &&
        targetUser.departmentId.toString() === currentUser.departmentId.toString()
      ) {
        authorized = true;
      }
    } else if (currentRole === 'DivisionHead') {
      // Division head can see officers under the same divisionId
      if (
        targetRole === 'Officer' &&
        targetUser.divisionId &&
        currentUser.divisionId &&
        targetUser.divisionId.toString() === currentUser.divisionId.toString()
      ) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: You are not allowed to view this user’s attendance' },
        { status: 403 }
      );
    }

    // 4. Date range logic (EXACTLY as original)
    let startDateStr, endDateStr;
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const daysLimit = parseInt(searchParams.get('days') || '0');

    if (startParam && endParam) {
      startDateStr = startParam;
      endDateStr = endParam;
    } else if (daysLimit > 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysLimit + 1);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
    } else {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    // Generate full list of dates in the range
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

    // 5. Fetch raw punch data from SQL Server (unchanged)
    const pool = await getSQLServerConnection();
    const result = await pool
      .request()
      .input('empCode', targetEmpCode)
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
    const attendance = dateList.map((date) => {
      const inTimes = inByDate[date] || [];
      const outTimes = outByDate[date] || [];
      let firstIn = null,
        lastOut = null,
        status = 'No punch';
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

      let inColor = '',
        outColor = '';
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
        date: new Date(date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        firstIn,
        lastOut,
        firstClass: inColor,
        lastClass: outColor,
        status,
      };
    });

    // 6. Return response (original format)
    if (targetUserName) {
      return NextResponse.json({ attendance, userName: targetUserName });
    }
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}