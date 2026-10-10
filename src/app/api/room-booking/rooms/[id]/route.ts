// src/app/api/room-booking/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/rooms/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db
      .collection("rb_rooms")
      .findOne({ _id: new ObjectId(id) });
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const beds = await db
      .collection("rb_beds")
      .find({ roomId: room._id })
      .sort({ bedLabel: 1 })
      .toArray();

    const roomTypes = await db.collection("rb_room_types").find({}).toArray();
    const typeMap = Object.fromEntries(roomTypes.map((t) => [t.code, t]));

    return NextResponse.json({
      room: {
        ...room,
        _id: room._id.toString(),
        roomTypeName: typeMap[room.roomTypeCode]?.name || room.roomTypeCode,
        beds: beds.map((b) => ({
          ...b,
          _id: b._id.toString(),
          roomId: b.roomId.toString(),
        })),
      },
    });
  } catch (error: any) {
    console.error("GET /rooms/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/room-booking/rooms/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const body = await req.json();
    delete body._id;
    delete body.createdAt;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db
      .collection("rb_rooms")
      .findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const update: Record<string, any> = { ...body, updatedAt: new Date() };
    if (update.floor !== undefined) update.floor = Number(update.floor);
    if (update.areaSqm !== undefined) update.areaSqm = Number(update.areaSqm);

    if (update.roomNumber && update.roomNumber !== before.roomNumber) {
      const dup = await db
        .collection("rb_rooms")
        .findOne({ roomNumber: update.roomNumber });
      if (dup) {
        return NextResponse.json(
          { error: `Room ${update.roomNumber} already exists` },
          { status: 409 },
        );
      }
    }

    const result = await db
      .collection("rb_rooms")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    await logAudit({
      action: "ROOM_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before, after: body },
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUT /rooms/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/room-booking/rooms/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db
      .collection("rb_rooms")
      .findOne({ _id: new ObjectId(id) });
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bedCount = await db
      .collection("rb_beds")
      .countDocuments({ roomId: new ObjectId(id) });
    const bookingCount = await db
      .collection("rb_bookings")
      .countDocuments({ roomId: new ObjectId(id) });

    if (bedCount > 0 || bookingCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete room with existing beds or bookings. Set status to INACTIVE instead.",
        },
        { status: 409 },
      );
    }

    await db.collection("rb_rooms").deleteOne({ _id: new ObjectId(id) });

    await logAudit({
      action: "ROOM_DELETE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: room },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /rooms/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}