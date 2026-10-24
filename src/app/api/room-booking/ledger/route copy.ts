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

    const ledgerItems = await db
      .collection("rb_ledger")
      .find({ staffId: new ObjectId(auth.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ ledger: ledgerItems }, { status: 200 });
  } catch (error) {
    console.error("Ledger fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}