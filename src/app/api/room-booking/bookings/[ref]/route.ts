// src/app/api/room-booking/bookings/[ref]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ref } = await params;
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const booking = await db
      .collection("rb_bookings")
      .findOne({ bookingRef: ref });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Access control
    if (
      !auth.user.isAdmin &&
      booking.bookedByStaffId.toString() !== auth.user.userId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Enrich with room + beds + ledger + approval
    const [room, beds, ledger, approval] = await Promise.all([
      db.collection("rb_rooms").findOne({ _id: booking.roomId }),
      db.collection("rb_beds").find({ _id: { $in: booking.bedIds || [] } }).toArray(),
      db.collection("rb_ledger").findOne({ bookingId: booking._id }),
      booking.approvalId
        ? db.collection("rb_approvals").findOne({ _id: booking.approvalId })
        : null,
    ]);

    return NextResponse.json({
      booking: {
        ...booking,
        _id: booking._id.toString(),
        bookedByStaffId: booking.bookedByStaffId.toString(),
        occupantId: booking.occupantId.toString(),
        roomId: booking.roomId.toString(),
        bedIds: (booking.bedIds || []).map((id: any) => id.toString()),
        approvalId: booking.approvalId ? booking.approvalId.toString() : null,
      },
      room: room ? { ...room, _id: room._id.toString() } : null,
      beds: beds.map((b) => ({ ...b, _id: b._id.toString(), roomId: b.roomId.toString() })),
      ledger: ledger
        ? { ...ledger, _id: ledger._id.toString(), bookingId: ledger.bookingId?.toString(), staffId: ledger.staffId?.toString() }
        : null,
      approval: approval
        ? { ...approval, _id: approval._id.toString(), bookingId: approval.bookingId.toString() }
        : null,
    });
  } catch (error: any) {
    console.error("GET /bookings/[ref] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}