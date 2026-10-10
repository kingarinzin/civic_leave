// src/app/api/room-booking/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 200);
    const action = searchParams.get("action");

    const filter: Record<string, any> = {};
    if (action) filter.action = action;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const entries = await db
      .collection("rb_audit")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .toArray();

    const staffIds = entries.map((e) => e.performedByStaffId).filter(Boolean);
    const staff = await db.collection("users").find({ _id: { $in: staffIds } }).toArray();
    const staffMap = Object.fromEntries(staff.map((s) => [s._id.toString(), { name: s.name, email: s.email }]));

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        _id: e._id.toString(),
        performedByStaffId: e.performedByStaffId?.toString(),
        targetId: e.targetId?.toString() || null,
        performerSnapshot: staffMap[e.performedByStaffId?.toString()] || null,
      })),
    });
  } catch (error: any) {
    console.error("GET /audit error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}