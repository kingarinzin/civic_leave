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
    const statusFilter = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Fetch the user's bookings
    const query: any = { bookedByStaffId: new ObjectId(auth.user.userId) };
    if (statusFilter) query.bookingStatus = statusFilter;

    const bookings = await db
      .collection("rb_bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Fetch the ledger entries for these bookings
    const bookingIds = bookings.map(b => b._id);
    const ledgers = await db
      .collection("rb_ledger")
      .find({ bookingId: { $in: bookingIds } })
      .toArray();

    // 3. Map ledger status by bookingId
    const ledgerMap = new Map();
    ledgers.forEach(l => {
      const bId = l.bookingId.toString();
      const existing = ledgerMap.get(bId);
      
      // If any ledger is UNPAID or PENDING_VERIFICATION, the whole booking is considered UNPAID
      if (!existing || l.status === "UNPAID" || l.status === "PENDING_VERIFICATION") {
        ledgerMap.set(bId, l.status);
      }
    });

    // 4. Merge the ledger status into the booking object
    const enrichedBookings = bookings.map(b => {
      const ledgerStatus = ledgerMap.get(b._id.toString()) || "UNPAID";
      
      // If the ledger is fully PAID, force the booking payment status to PAID
      const finalPaymentStatus = (ledgerStatus === "PAID") ? "PAID" : "UNPAID";

      return {
        ...b,
        _id: b._id.toString(),
        paymentStatus: finalPaymentStatus,
        guests: (b.guests || []).map((g: any) => ({
            ...g,
            checkIn: g.checkIn?.toISOString ? g.checkIn.toISOString() : g.checkIn,
            checkOut: g.checkOut?.toISOString ? g.checkOut.toISOString() : g.checkOut,
        }))
      };
    });

    return NextResponse.json({ bookings: enrichedBookings });
  } catch (error: any) {
    console.error("GET /bookings/my error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}