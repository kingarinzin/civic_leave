// src/app/api/room-booking/ledger/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/ledger?status=UNPAID|PAID|WAIVED&staffId=
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (staffId && ObjectId.isValid(staffId)) filter.staffId = new ObjectId(staffId);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const entries = await db
      .collection("rb_ledger")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    // Enrich with staff + booking info
    const staffIds = entries.map((e) => e.staffId).filter(Boolean);
    const bookingIds = entries.map((e) => e.bookingId).filter(Boolean);

    const [staff, bookings] = await Promise.all([
      db.collection("users").find({ _id: { $in: staffIds } }).toArray(),
      db.collection("rb_bookings").find({ _id: { $in: bookingIds } }).toArray(),
    ]);

    const staffMap = Object.fromEntries(staff.map((s) => [s._id.toString(), { name: s.name, email: s.email }]));
    const bookingMap = Object.fromEntries(bookings.map((b) => [b._id.toString(), { bookingRef: b.bookingRef, roomNumberSnapshot: b.roomNumberSnapshot }]));

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        _id: e._id.toString(),
        staffId: e.staffId.toString(),
        bookingId: e.bookingId?.toString() || null,
        settledByStaffId: e.settledByStaffId?.toString() || null,
        staffSnapshot: staffMap[e.staffId.toString()] || null,
        bookingSnapshot: e.bookingId ? bookingMap[e.bookingId.toString()] || null : null,
      })),
      totals: {
        count: entries.length,
        unpaid: entries.filter((e) => e.status === "UNPAID").reduce((s, e) => s + Number(e.amount || 0), 0),
        paid: entries.filter((e) => e.status === "PAID").reduce((s, e) => s + Number(e.amount || 0), 0),
        waived: entries.filter((e) => e.status === "WAIVED").reduce((s, e) => s + Number(e.amount || 0), 0),
      },
    });
  } catch (error: any) {
    console.error("GET /ledger error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}