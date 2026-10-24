// src/app/api/room-booking/admin/ledger/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const query: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      query.status = statusFilter;
    }

    // 1. Fetch ledger items
    const ledgerItems = await db
      .collection("rb_ledger")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // 2. Fetch bookings to attach the Booking Reference
    const bookingIds = ledgerItems.map(l => l.bookingId);
    const bookings = await db
      .collection("rb_bookings")
      .find({ _id: { $in: bookingIds } })
      .toArray();
    const bookingMap = new Map(bookings.map(b => [b._id.toString(), b]));

    // 3. Enrich
    const enriched = ledgerItems.map(l => {
      const b = bookingMap.get(l.bookingId.toString());
      return {
        ...l,
        _id: l._id.toString(),
        bookingRef: b?.bookingRef || "N/A",
      };
    });

    return NextResponse.json({ ledger: enriched }, { status: 200 });
  } catch (error) {
    console.error("Admin Ledger fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}