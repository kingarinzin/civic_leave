// src/app/api/room-booking/ledger/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    // 1. Verify normal user (NOT admin)
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 2. Fetch ALL bills for this specific user (no status filter)
    const userBills = await db
      .collection("rb_ledger")
      .find({ 
        staffId: new ObjectId(auth.user.userId)
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ ledger: userBills }, { status: 200 });
  } catch (error) {
    console.error("User Ledger fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } 
}