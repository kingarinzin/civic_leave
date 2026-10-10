// src/app/api/room-booking/reports/aging/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/reports/aging
 * Pending bills aged by days.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const unpaid = await db
      .collection("rb_ledger")
      .find({ status: "UNPAID" })
      .toArray();

    const now = Date.now();
    const buckets = {
      "0-7": { count: 0, total: 0 },
      "8-30": { count: 0, total: 0 },
      "31-60": { count: 0, total: 0 },
      "61-90": { count: 0, total: 0 },
      "90+": { count: 0, total: 0 },
    };

    const staffIds = unpaid.map((u) => u.staffId).filter(Boolean);
    const staff = await db
      .collection("users")
      .find({ _id: { $in: staffIds } })
      .toArray();
    const staffMap = Object.fromEntries(staff.map((s) => [s._id.toString(), { name: s.name, email: s.email }]));

    const items = unpaid.map((u) => {
      const ageDays = Math.floor((now - new Date(u.createdAt).getTime()) / 86400000);
      let bucket: keyof typeof buckets = "0-7";
      if (ageDays > 90) bucket = "90+";
      else if (ageDays > 60) bucket = "61-90";
      else if (ageDays > 30) bucket = "31-60";
      else if (ageDays > 7) bucket = "8-30";

      buckets[bucket].count++;
      buckets[bucket].total += Number(u.amount || 0);

      return {
        _id: u._id.toString(),
        staffId: u.staffId?.toString(),
        amount: u.amount,
        dueDate: u.dueDate,
        createdAt: u.createdAt,
        ageDays,
        bucket,
        staffSnapshot: staffMap[u.staffId?.toString()] || null,
      };
    });

    return NextResponse.json({ buckets, items });
  } catch (error: any) {
    console.error("GET /reports/aging error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}