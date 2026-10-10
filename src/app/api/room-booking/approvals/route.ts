// src/app/api/room-booking/approvals/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/approvals?status=PENDING
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Only APIC-level roles + admin can view approvals
    const canApprove =
      auth.user.isAdmin ||
      ["Commissioner", "Chairperson", "SecretaryService"].includes(auth.user.role);

    if (!canApprove) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const approvals = await db
      .collection("rb_approvals")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    // Enrich
    const bookingIds = approvals.map((a) => a.bookingId).filter(Boolean);
    const staffIds = approvals.map((a) => a.requestedByStaffId).filter(Boolean);

    const [bookings, staff, rooms] = await Promise.all([
      db.collection("rb_bookings").find({ _id: { $in: bookingIds } }).toArray(),
      db.collection("users").find({ _id: { $in: staffIds } }).toArray(),
      db.collection("rb_rooms").find({}).toArray(),
    ]);

    const bookingMap = Object.fromEntries(bookings.map((b) => [b._id.toString(), b]));
    const staffMap = Object.fromEntries(staff.map((s) => [s._id.toString(), { name: s.name, email: s.email, role: s.role }]));
    const roomMap = Object.fromEntries(rooms.map((r) => [r._id.toString(), r.roomNumber]));

    return NextResponse.json({
      approvals: approvals.map((a) => {
        const booking = bookingMap[a.bookingId?.toString()];
        return {
          ...a,
          _id: a._id.toString(),
          bookingId: a.bookingId?.toString(),
          requestedByStaffId: a.requestedByStaffId?.toString(),
          apicStaffId: a.apicStaffId?.toString() || null,
          requestedBySnapshot: staffMap[a.requestedByStaffId?.toString()] || null,
          bookingSnapshot: booking
            ? {
                bookingRef: booking.bookingRef,
                occupantName: booking.occupantSnapshot?.fullName,
                occupantAgency: booking.occupantSnapshot?.agencyName || "-",
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                totalAmount: booking.totalAmount,
                roomNumber: roomMap[booking.roomId?.toString()] || "-",
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    console.error("GET /approvals error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}