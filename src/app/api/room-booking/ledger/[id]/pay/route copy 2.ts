import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { method, referenceNumber } = await req.json();

    if (!method || !referenceNumber) {
      return NextResponse.json(
        { error: "Payment method and reference number are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Update the Ledger Entry to PENDING_VERIFICATION
    const ledgerResult = await db.collection("rb_ledger").updateOne(
      { _id: new ObjectId(id), staffId: new ObjectId(auth.user.userId) },
      {
        $set: {
          status: "PENDING_VERIFICATION",
          paymentMethod: method,
          paymentReference: referenceNumber,
          paymentDate: new Date(),
        },
      }
    );

    if (ledgerResult.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // 2. Update the Parent Booking's paymentStatus to match
    const ledgerEntry = await db.collection("rb_ledger").findOne({ _id: new ObjectId(id) });
    if (ledgerEntry && ledgerEntry.bookingId) {
      await db.collection("rb_bookings").updateOne(
        { _id: new ObjectId(ledgerEntry.bookingId) },
        { $set: { paymentStatus: "PENDING_VERIFICATION" } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}