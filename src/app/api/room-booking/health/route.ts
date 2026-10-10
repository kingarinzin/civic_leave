// app/api/room-booking/health/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getStorageRoot } from "@/lib/storage";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const [rooms, beds, bookings, familyRegistry, residents, ledger, masterCounts] =
      await Promise.all([
        db.collection("rb_rooms").countDocuments(),
        db.collection("rb_beds").countDocuments(),
        db.collection("rb_bookings").countDocuments(),
        db.collection("rb_family_registry").countDocuments(),
        db.collection("rb_residents").countDocuments(),
        db.collection("rb_ledger").countDocuments(),
        Promise.all([
          db.collection("rb_room_types").countDocuments(),
          db.collection("rb_bed_types").countDocuments(),
          db.collection("rb_amenities").countDocuments(),
          db.collection("rb_rate_tiers").countDocuments(),
          db.collection("rb_relationships").countDocuments(),
          db.collection("rb_proof_types").countDocuments(),
          db.collection("rb_reservation_reasons").countDocuments(),
          db.collection("rb_waiver_reasons").countDocuments(),
        ]),
      ]);

    return NextResponse.json({
      status: "ok",
      module: "room-booking",
      timestamp: new Date().toISOString(),
      storage: {
        provider: "local",
        root: getStorageRoot(),
      },
      counts: {
        rooms, beds, bookings, familyRegistry, residents, ledger,
        masters: {
          roomTypes: masterCounts[0],
          bedTypes: masterCounts[1],
          amenities: masterCounts[2],
          rateTiers: masterCounts[3],
          relationships: masterCounts[4],
          proofTypes: masterCounts[5],
          reservationReasons: masterCounts[6],
          waiverReasons: masterCounts[7],
        },
      },
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}