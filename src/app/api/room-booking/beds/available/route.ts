// src/app/api/room-booking/beds/available/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const roomType = searchParams.get("roomType");
    const bedType = searchParams.get("bedType");

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const roomFilter: Record<string, any> = { status: "ACTIVE" };
    if (roomType) roomFilter.roomTypeCode = roomType;

    const rooms = await db.collection("rb_rooms").find(roomFilter).toArray();
    const roomIds = rooms.map((r) => r._id);

    const bedFilter: Record<string, any> = {
      roomId: { $in: roomIds },
      status: { $in: ["AVAILABLE", "RESERVED"] },
    };
    if (bedType) bedFilter.bedTypeCode = bedType;

    const beds = await db
      .collection("rb_beds")
      .find(bedFilter)
      .sort({ roomNumber: 1, bedLabel: 1 })
      .toArray();

    let conflictingBedIds = new Set<string>();
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);

      const conflicting = await db
        .collection("rb_bookings")
        .find({
          bookingStatus: { $in: ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN"] },
          $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }],
        })
        .toArray();

      for (const b of conflicting) {
        for (const bedId of b.bedIds || []) {
          conflictingBedIds.add(bedId.toString());
        }
      }
    }

    const availableBeds = beds
      .filter((b) => !conflictingBedIds.has(b._id.toString()))
      .map((b) => ({
        ...b,
        _id: b._id.toString(),
        roomId: b.roomId.toString(),
        currentBookingId: b.currentBookingId
          ? b.currentBookingId.toString()
          : null,
      }));

    const roomsMap = Object.fromEntries(
      rooms.map((r) => [r._id.toString(), { ...r, _id: r._id.toString() }]),
    );

    return NextResponse.json({ beds: availableBeds, rooms: roomsMap });
  } catch (error: any) {
    console.error("GET /beds/available error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}