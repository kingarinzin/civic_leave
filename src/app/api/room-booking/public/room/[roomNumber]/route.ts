// src/app/api/room-booking/public/room/[roomNumber]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/**
 * GET /api/room-booking/public/room/[roomNumber]
 * No auth. Returns room info for QR landing page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomNumber: string }> },
) {
  try {
    const { roomNumber } = await params;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db.collection("rb_rooms").findOne({ roomNumber });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Public-safe fields only
    return NextResponse.json({
      room: {
        roomNumber: room.roomNumber,
        roomName: room.roomName,
        roomTypeCode: room.roomTypeCode,
        floor: room.floor,
        areaSqm: room.areaSqm,
        description: room.description,
        amenities: room.amenities || [],
        photos: (room.photos || []).map((p: any) => ({
          url: p.url,
          isPrimary: p.isPrimary,
        })),
        wifiPassword: room.wifiPassword || null,
        emergencyContact: room.emergencyContact || null,
        // NO beds, NO rates, NO bookings — private
      },
    });
  } catch (error: any) {
    console.error("GET /public/room/[roomNumber] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}