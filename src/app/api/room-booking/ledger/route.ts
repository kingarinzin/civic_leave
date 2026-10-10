// src/app/api/room-booking/ledger/pending/route.ts
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

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const entries = await db
      .collection("rb_ledger")
      .find({
        staffId: new ObjectId(auth.user.userId),
        status: "UNPAID",
      })
      .toArray();

    const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return NextResponse.json({
      count: entries.length,
      total,
      entries: entries.map((e) => ({
        ...e,
        _id: e._id.toString(),
        bookingId: e.bookingId?.toString(),
        staffId: e.staffId?.toString(),
      })),
    });
  } catch (error: any) {
    console.error("GET /ledger/pending error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
