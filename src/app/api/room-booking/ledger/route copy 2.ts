import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Fetch all ledger items for this user
    const ledgerItems = await db
      .collection("rb_ledger")
      .find({ staffId: new ObjectId(auth.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Fetch associated bookings to get the Booking Reference
    const bookingIds = ledgerItems.map(l => l.bookingId);
    const bookings = await db
      .collection("rb_bookings")
      .find({ _id: { $in: bookingIds } })
      .toArray();
      
    const bookingMap = new Map(bookings.map(b => [b._id.toString(), b]));

    // 3. Merge the data
    const enrichedLedger = ledgerItems.map(l => {
      const booking = bookingMap.get(l.bookingId.toString());
      return {
        ...l,
        _id: l._id.toString(),
        bookingId: l.bookingId.toString(),
        bookingRef: booking?.bookingRef || "N/A", 
      };
    });

    return NextResponse.json({ ledger: enrichedLedger }, { status: 200 });
  } catch (error) {
    console.error("Ledger fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}