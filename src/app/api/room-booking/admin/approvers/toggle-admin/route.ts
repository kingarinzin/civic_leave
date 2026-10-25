import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { userId, isActive } = await req.json();

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // Update the specific user's isRoomBookingAdmin flag
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isRoomBookingAdmin: isActive } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}