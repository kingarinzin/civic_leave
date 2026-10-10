// src/app/api/room-booking/residents/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/residents?status=ACTIVE|RELEASED
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const residents = await db
      .collection("rb_residents")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with staff + room + bed
    const staffIds = residents.map((r) => r.staffId).filter(Boolean);
    const roomIds = residents.map((r) => r.roomId).filter(Boolean);
    const bedIds = residents.map((r) => r.bedId).filter(Boolean);

    const [staff, rooms, beds] = await Promise.all([
      db.collection("users").find({ _id: { $in: staffIds } }).toArray(),
      db.collection("rb_rooms").find({ _id: { $in: roomIds } }).toArray(),
      db.collection("rb_beds").find({ _id: { $in: bedIds } }).toArray(),
    ]);

    const staffMap = Object.fromEntries(
      staff.map((s) => [s._id.toString(), { name: s.name, email: s.email, cid: s.cid }]),
    );
    const roomMap = Object.fromEntries(
      rooms.map((r) => [r._id.toString(), { roomNumber: r.roomNumber, roomTypeCode: r.roomTypeCode }]),
    );
    const bedMap = Object.fromEntries(
      beds.map((b) => [b._id.toString(), { bedLabel: b.bedLabel, bedTypeCode: b.bedTypeCode }]),
    );

    return NextResponse.json({
      residents: residents.map((r) => ({
        ...r,
        _id: r._id.toString(),
        staffId: r.staffId.toString(),
        roomId: r.roomId.toString(),
        bedId: r.bedId?.toString() || null,
        staffSnapshot: staffMap[r.staffId.toString()] || null,
        roomSnapshot: roomMap[r.roomId.toString()] || null,
        bedSnapshot: r.bedId ? bedMap[r.bedId.toString()] || null : null,
      })),
    });
  } catch (error: any) {
    console.error("GET /residents error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/room-booking/residents
 * Body: { staffId, roomId, bedId, rateType: "MONTHLY" | "NIGHTLY_FLAT", rateValue }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { staffId, roomId, bedId, rateType, rateValue } = body;

    if (!staffId || !roomId || !bedId || !rateType || rateValue === undefined) {
      return NextResponse.json(
        { error: "staffId, roomId, bedId, rateType, rateValue are required" },
        { status: 400 },
      );
    }

    if (!["MONTHLY", "NIGHTLY_FLAT"].includes(rateType)) {
      return NextResponse.json(
        { error: "rateType must be MONTHLY or NIGHTLY_FLAT" },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(staffId) || !ObjectId.isValid(roomId) || !ObjectId.isValid(bedId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // Check existing resident
    const existing = await db.collection("rb_residents").findOne({
      staffId: new ObjectId(staffId),
      status: "ACTIVE",
    });
    if (existing) {
      return NextResponse.json(
        { error: "This staff member is already an active resident" },
        { status: 409 },
      );
    }

    // Check staff exists
    const staff = await db.collection("users").findOne({ _id: new ObjectId(staffId) });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    // Check room + bed
    const room = await db.collection("rb_rooms").findOne({ _id: new ObjectId(roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const bed = await db.collection("rb_beds").findOne({ _id: new ObjectId(bedId) });
    if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });

    if (bed.roomId.toString() !== roomId) {
      return NextResponse.json({ error: "Bed does not belong to this room" }, { status: 400 });
    }

    if (bed.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Bed is currently ${bed.status}` },
        { status: 409 },
      );
    }

    const now = new Date();

    // Create resident record
    const residentDoc = {
      staffId: new ObjectId(staffId),
      roomId: new ObjectId(roomId),
      bedId: new ObjectId(bedId),
      residentSince: now,
      rateType,
      rateValue: Number(rateValue),
      status: "ACTIVE",
      releasedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rb_residents").insertOne(residentDoc);

    // Mark bed as OCCUPIED + flag room as resident room
    await db.collection("rb_beds").updateOne(
      { _id: new ObjectId(bedId) },
      {
        $set: {
          status: "OCCUPIED",
          notes: `Resident: ${staff.name}`,
          updatedAt: now,
        },
      },
    );

    await db.collection("rb_rooms").updateOne(
      { _id: new ObjectId(roomId) },
      {
        $set: {
          isResidentRoom: true,
          residentStaffId: new ObjectId(staffId),
          updatedAt: now,
        },
      },
    );

    await logAudit({
      action: "RESIDENT_ASSIGN",
      performedByStaffId: auth.user.userId,
      targetType: "rb_residents",
      targetId: result.insertedId,
      ipAddress: getClientIP(req),
      details: { staffId, roomNumber: room.roomNumber, bedLabel: bed.bedLabel, rateType, rateValue },
    });

    return NextResponse.json(
      { success: true, residentId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /residents error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}