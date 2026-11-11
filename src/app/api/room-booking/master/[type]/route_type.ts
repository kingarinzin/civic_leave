// src/app/api/room-booking/master/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

const MASTER_COLLECTIONS = [
  "rb_room_types",
  "rb_bed_types",
  "rb_amenities",
  "rb_rate_tiers",
  "rb_relationships",
  "rb_proof_types",
  "rb_reservation_reasons",
  "rb_waiver_reasons",
];

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const result: Record<string, any[]> = {};
    await Promise.all(
      MASTER_COLLECTIONS.map(async (col) => {
        result[col] = await db
          .collection(col)
          .find({ isActive: { $ne: false } })
          .sort({ sortOrder: 1 })
          .toArray();
      }),
    );

    return NextResponse.json({ masters: result });
  } catch (error: any) {
    console.error("GET /api/room-booking/master error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}