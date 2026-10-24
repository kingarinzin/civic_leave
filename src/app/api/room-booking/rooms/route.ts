// src/app/api/room-booking/rooms/route.ts
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

    const { searchParams } = new URL(req.url);
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Fetch Rooms and Beds
    const rooms = await db.collection("rb_rooms").find({}).toArray();
    const beds = await db.collection("rb_beds").find({}).toArray();
    const roomTypes = await db.collection("rb_room_types").find({}).toArray();
    const typeMap = Object.fromEntries(roomTypes.map((t) => [t.code, t]));

    // 2. Find Conflicting Bookings for the requested dates
    let bookedBedIds = new Set<string>();
    
    if (checkInStr && checkOutStr) {
      const checkIn = new Date(checkInStr);
      const checkOut = new Date(checkOutStr);

      // Find all active bookings that overlap with these dates
      const conflicts = await db.collection("rb_bookings").find({
        bookingStatus: { $in: ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN"] },
        "guests.checkIn": { $lt: checkOut },
        "guests.checkOut": { $gt: checkIn },
      }).toArray();

      // Collect all bed IDs from conflicting bookings
      conflicts.forEach(booking => {
        (booking.bedIds || []).forEach((id: any) => bookedBedIds.add(id.toString()));
      });
    }

    // 3. Map Data
    const bedsByRoom: Record<string, any[]> = {};
    for (const bed of beds) {
      const key = bed.roomId.toString();
      if (!bedsByRoom[key]) bedsByRoom[key] = [];
      
      // If dates were provided, dynamically determine status
      // If no dates provided, fallback to the static DB status
      let dynamicStatus = bed.status;
      if (checkInStr && checkOutStr) {
        dynamicStatus = bookedBedIds.has(bed._id.toString()) ? "OCCUPIED" : "AVAILABLE";
      }

      bedsByRoom[key].push({
        ...bed,
        _id: bed._id.toString(),
        roomId: bed.roomId.toString(),
        status: dynamicStatus // Override with dynamic status
      });
    }

    // 4. Enrich Rooms
    const enriched = rooms.map((room) => {
      const roomBeds = bedsByRoom[room._id.toString()] || [];
      const available = roomBeds.filter((b) => b.status === "AVAILABLE").length;
      const occupied = roomBeds.filter((b) => b.status === "OCCUPIED").length;
      const reserved = roomBeds.filter((b) => b.status === "RESERVED").length;
      const maintenance = roomBeds.filter((b) => b.status === "MAINTENANCE").length;

      return {
        ...room,
        _id: room._id.toString(),
        roomTypeName: typeMap[room.roomTypeCode]?.name || room.roomTypeCode,
        beds: roomBeds,
        bedSummary: {
          total: roomBeds.length,
          available,
          occupied,
          reserved,
          maintenance,
        },
      };
    });

    return NextResponse.json({ rooms: enriched });
  } catch (error: any) {
    console.error("GET /rooms error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}