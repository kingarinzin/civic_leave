// src/app/api/room-booking/admin/ledger/[id]/verify/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { action } = await req.json();

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const newStatus = action === "APPROVE" ? "PAID" : "UNPAID";

    // 1. Update Ledger
    const ledgerResult = await db.collection("rb_ledger").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus, verifiedBy: auth.user.email, verifiedAt: new Date() } }
    );

    if (ledgerResult.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // 2. Update Booking
    const ledgerEntry = await db.collection("rb_ledger").findOne({ _id: new ObjectId(id) });
    if (ledgerEntry && ledgerEntry.bookingId) {
      await db.collection("rb_bookings").updateOne(
        { _id: new ObjectId(ledgerEntry.bookingId) },
        { $set: { paymentStatus: newStatus } }
      );
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}