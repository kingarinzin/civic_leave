// src/app/api/room-booking/bookings/my/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: Record<string, any> = {
      bookedByStaffId: new ObjectId(auth.user.userId),
    };
    if (status) filter.bookingStatus = status;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const bookings = await db
      .collection("rb_bookings")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch rooms + ledgers in bulk
    const roomIds = bookings.map((b) => b.roomId).filter(Boolean);
    const bookingIds = bookings.map((b) => b._id);

    const [rooms, ledgers] = await Promise.all([
      db.collection("rb_rooms").find({ _id: { $in: roomIds } }).toArray(),
      db.collection("rb_ledger").find({ bookingId: { $in: bookingIds } }).toArray(),
    ]);

    const roomMap = Object.fromEntries(rooms.map((r) => [r._id.toString(), r]));
    const ledgerMap = Object.fromEntries(
      ledgers.map((l) => [l.bookingId?.toString(), l]),
    );

    return NextResponse.json({
      bookings: bookings.map((b) => {
        const room = roomMap[b.roomId?.toString()];
        const ledger = ledgerMap[b._id.toString()];
        return {
          ...b,
          _id: b._id.toString(),
          bookedByStaffId: b.bookedByStaffId.toString(),
          occupantId: b.occupantId.toString(),
          roomId: b.roomId.toString(),
          bedIds: (b.bedIds || []).map((id: any) => id.toString()),
          approvalId: b.approvalId ? b.approvalId.toString() : null,
          room: room ? { _id: room._id.toString(), roomNumber: room.roomNumber, roomTypeCode: room.roomTypeCode } : null,
          ledger: ledger
            ? { _id: ledger._id.toString(), amount: ledger.amount, status: ledger.status }
            : null,
        };
      }),
    });
  } catch (error: any) {
    console.error("GET /bookings/my error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}