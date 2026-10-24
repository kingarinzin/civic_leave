import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <-- FIXED HERE FOR NEXT.JS 16
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params; // <-- FIXED HERE FOR NEXT.JS 16
    const { method, referenceNumber } = await req.json();

    if (!method || !referenceNumber) {
      return NextResponse.json(
        { error: "Payment method and reference number are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const result = await db.collection("rb_ledger").updateOne(
      { 
        _id: new ObjectId(id),
        staffId: new ObjectId(auth.user.userId) 
      },
      {
        $set: {
          status: "PENDING_VERIFICATION",
          paymentMethod: method,
          paymentReference: referenceNumber,
          paymentDate: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}