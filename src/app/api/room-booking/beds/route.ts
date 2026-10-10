// src/app/api/room-booking/beds/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const filter: Record<string, any> = {};
    if (roomId && ObjectId.isValid(roomId)) filter.roomId = new ObjectId(roomId);
    if (status) filter.status = status;
    if (type) filter.bedTypeCode = type;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const beds = await db
      .collection("rb_beds")
      .find(filter)
      .sort({ roomNumber: 1, bedLabel: 1 })
      .toArray();

    return NextResponse.json({
      beds: beds.map((b) => ({
        ...b,
        _id: b._id.toString(),
        roomId: b.roomId.toString(),
        currentBookingId: b.currentBookingId
          ? b.currentBookingId.toString()
          : null,
      })),
    });
  } catch (error: any) {
    console.error("GET /beds error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    if (!body.roomId || !body.bedLabel || !body.bedTypeCode) {
      return NextResponse.json(
        { error: "roomId, bedLabel and bedTypeCode are required" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(body.roomId)) {
      return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db
      .collection("rb_rooms")
      .findOne({ _id: new ObjectId(body.roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const dup = await db.collection("rb_beds").findOne({
      roomId: new ObjectId(body.roomId),
      bedLabel: body.bedLabel,
    });
    if (dup) {
      return NextResponse.json(
        { error: `Bed ${body.bedLabel} already exists in room ${room.roomNumber}` },
        { status: 409 },
      );
    }

    const now = new Date();
    const bedDoc = {
      roomId: new ObjectId(body.roomId),
      roomNumber: room.roomNumber,
      bedLabel: body.bedLabel,
      bedTypeCode: body.bedTypeCode,
      status: "AVAILABLE",
      currentBookingId: null,
      rates: body.rates || {
        tier1: 0,
        tier2: 0,
        tier3: 0,
        tier4: 0,
        tier5: 0,
      },
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rb_beds").insertOne(bedDoc);

    await db.collection("rb_rooms").updateOne(
      { _id: room._id },
      { $inc: { bedCount: 1 }, $set: { updatedAt: now } },
    );

    await logAudit({
      action: "BED_CREATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_beds",
      targetId: result.insertedId,
      ipAddress: getClientIP(req),
      details: { bedDoc },
    });

    return NextResponse.json(
      { success: true, bedId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /beds error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}