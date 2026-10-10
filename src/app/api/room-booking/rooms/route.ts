// src/app/api/room-booking/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";

/**
 * GET /api/room-booking/rooms
 * List all rooms + bed summary (available/occupied).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const rooms = await db
      .collection("rb_rooms")
      .find({})
      .sort({ roomNumber: 1 })
      .toArray();

    const beds = await db.collection("rb_beds").find({}).toArray();

    const bedsByRoom: Record<string, any[]> = {};
    for (const bed of beds) {
      const key = bed.roomId.toString();
      if (!bedsByRoom[key]) bedsByRoom[key] = [];
      bedsByRoom[key].push(bed);
    }

    const roomTypes = await db.collection("rb_room_types").find({}).toArray();
    const typeMap = Object.fromEntries(roomTypes.map((t) => [t.code, t]));

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
        beds: roomBeds.map((b) => ({
          ...b,
          _id: b._id.toString(),
          roomId: b.roomId.toString(),
        })),
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

/**
 * POST /api/room-booking/rooms
 * Create a new room + optionally its default beds.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    if (!body.roomNumber || !body.roomTypeCode) {
      return NextResponse.json(
        { error: "roomNumber and roomTypeCode are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const existing = await db
      .collection("rb_rooms")
      .findOne({ roomNumber: body.roomNumber });
    if (existing) {
      return NextResponse.json(
        { error: `Room ${body.roomNumber} already exists` },
        { status: 409 },
      );
    }

    const roomType = await db
      .collection("rb_room_types")
      .findOne({ code: body.roomTypeCode });
    if (!roomType) {
      return NextResponse.json(
        { error: `Invalid room type: ${body.roomTypeCode}` },
        { status: 400 },
      );
    }

    const now = new Date();
    const beds = Array.isArray(body.beds) ? body.beds : [];

    const roomDoc = {
      roomNumber: body.roomNumber,
      roomName: body.roomName || body.roomNumber,
      roomTypeCode: body.roomTypeCode,
      floor: Number(body.floor) || 1,
      areaSqm: Number(body.areaSqm) || 0,
      description: body.description || "",
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      photos: [],
      wifiPassword: body.wifiPassword || "",
      emergencyContact: body.emergencyContact || "",
      bedCount: beds.length,
      isResidentRoom: body.roomTypeCode === "RESIDENT",
      residentStaffId: null,
      status: "ACTIVE",
      qrCodeUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rb_rooms").insertOne(roomDoc);

    if (beds.length > 0) {
      const bedDocs = beds.map((b: any) => ({
        roomId: result.insertedId,
        roomNumber: body.roomNumber,
        bedLabel: b.bedLabel || b.label,
        bedTypeCode: b.bedTypeCode || b.typeCode || "SINGLE",
        status: "AVAILABLE",
        currentBookingId: null,
        rates: b.rates || { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
        notes: null,
        createdAt: now,
        updatedAt: now,
      }));
      await db.collection("rb_beds").insertMany(bedDocs);
    }

    await logAudit({
      action: "ROOM_CREATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: result.insertedId,
      ipAddress: getClientIP(req),
      details: { room: roomDoc, bedCount: beds.length },
    });

    return NextResponse.json(
      { success: true, roomId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /rooms error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}