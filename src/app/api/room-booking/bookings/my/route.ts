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

    // 1. Fetch Bookings
    const query: any = { bookedByStaffId: new ObjectId(auth.user.userId) };
    if (statusFilter) query.bookingStatus = statusFilter;

    const bookings = await db
      .collection("rb_bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Fetch Ledgers to check the TRUE payment status
    const bookingIds = bookings.map(b => b._id);
    const ledgers = await db
      .collection("rb_ledger")
      .find({ bookingId: { $in: bookingIds } })
      .toArray();

    // 3. Map the status
    const ledgerMap = new Map();
    ledgers.forEach(l => {
      const bId = l.bookingId.toString();
      const existing = ledgerMap.get(bId);
      
      // If ANY ledger is UNPAID or PENDING, the booking is considered unpaid.
      // Otherwise, it's PAID (or PENDING_VERIFICATION).
      if (!existing || l.status === "UNPAID" || l.status === "PENDING_VERIFICATION") {
        ledgerMap.set(bId, l.status);
      }
    });

    // 4. Merge
    const enrichedBookings = bookings.map(b => {
      const ledgerStatus = ledgerMap.get(b._id.toString());
      
      // If the ledger says PAID, force the booking to show PAID
      let finalPaymentStatus = b.paymentStatus;
      if (ledgerStatus === "PAID") finalPaymentStatus = "PAID";
      if (ledgerStatus === "PENDING_VERIFICATION") finalPaymentStatus = "PENDING_VERIFICATION";
      if (ledgerStatus === "UNPAID") finalPaymentStatus = "UNPAID";

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