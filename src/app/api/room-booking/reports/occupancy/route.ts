// src/app/api/room-booking/reports/occupancy/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

/**
 * GET /api/room-booking/reports/occupancy?from=&to=
 * Returns daily bed occupancy for a date range (default: last 30 days).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const totalBeds = await db.collection("rb_beds").countDocuments({});
    const totalRooms = await db.collection("rb_rooms").countDocuments({});

    // Get all bookings in range
    const bookings = await db
      .collection("rb_bookings")
      .find({
        bookingStatus: { $in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkIn: { $lt: to },
        checkOut: { $gt: from },
      })
      .toArray();

    // Build per-day occupancy
    const daily: { date: string; occupied: number; available: number; occupancyRate: number }[] = [];

    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < to) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setDate(dayEnd.getDate() + 1);

      let occupiedBeds = 0;
      for (const b of bookings) {
        if (new Date(b.checkIn) < dayEnd && new Date(b.checkOut) > dayStart) {
          occupiedBeds += (b.bedIds || []).length;
        }
      }

      daily.push({
        date: dayStart.toISOString().slice(0, 10),
        occupied: occupiedBeds,
        available: Math.max(0, totalBeds - occupiedBeds),
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // Currently occupied
    const currentlyOccupied = await db
      .collection("rb_beds")
      .countDocuments({ status: "OCCUPIED" });
    const currentlyReserved = await db
      .collection("rb_beds")
      .countDocuments({ status: "RESERVED" });
    const currentlyAvailable = await db
      .collection("rb_beds")
      .countDocuments({ status: "AVAILABLE" });

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        totalBeds,
        totalRooms,
        currentlyOccupied,
        currentlyReserved,
        currentlyAvailable,
      },
      daily,
    });
  } catch (error: any) {
    console.error("GET /reports/occupancy error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}