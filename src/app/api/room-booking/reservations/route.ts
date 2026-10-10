// src/app/api/room-booking/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/reservations
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const reservations = await db
      .collection("rb_reservations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const roomIds = reservations.map((r) => r.roomId).filter(Boolean);
    const rooms = await db
      .collection("rb_rooms")
      .find({ _id: { $in: roomIds } })
      .toArray();
    const reasons = await db.collection("rb_reservation_reasons").find({}).toArray();

    const roomMap = Object.fromEntries(rooms.map((r) => [r._id.toString(), r]));
    const reasonMap = Object.fromEntries(reasons.map((r) => [r.code, r]));

    return NextResponse.json({
      reservations: reservations.map((r) => ({
        ...r,
        _id: r._id.toString(),
        roomId: r.roomId.toString(),
        bedIds: (r.bedIds || []).map((id: any) => id.toString()),
        createdByStaffId: r.createdByStaffId?.toString(),
        roomSnapshot: roomMap[r.roomId.toString()]
          ? {
              roomNumber: roomMap[r.roomId.toString()].roomNumber,
              roomTypeCode: roomMap[r.roomId.toString()].roomTypeCode,
            }
          : null,
        reasonName: reasonMap[r.reservationReasonCode]?.name || r.reservationReasonCode,
      })),
    });
  } catch (error: any) {
    console.error("GET /reservations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/room-booking/reservations
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { roomId, reservationReasonCode, reservedFrom, reservedUntil } = body;

    if (!roomId || !reservationReasonCode || !reservedFrom || !reservedUntil) {
      return NextResponse.json(
        {
          error:
            "roomId, reservationReasonCode, reservedFrom, reservedUntil are required",
        },
        { status: 400 },
      );
    }

    if (!ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
    }

    const from = new Date(reservedFrom);
    const until = new Date(reservedUntil);
    if (until <= from) {
      return NextResponse.json(
        { error: "reservedUntil must be after reservedFrom" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db.collection("rb_rooms").findOne({ _id: new ObjectId(roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const reason = await db
      .collection("rb_reservation_reasons")
      .findOne({ code: reservationReasonCode, isActive: { $ne: false } });
    if (!reason) {
      return NextResponse.json({ error: "Invalid reservation reason" }, { status: 400 });
    }

    const bedIdsRaw = Array.isArray(body.bedIds) ? body.bedIds : [];
    let bedObjectIds: ObjectId[] = [];

    if (bedIdsRaw.length > 0) {
      bedObjectIds = bedIdsRaw.map((id: string) => new ObjectId(id));
      const beds = await db
        .collection("rb_beds")
        .find({ _id: { $in: bedObjectIds } })
        .toArray();

      if (beds.length !== bedObjectIds.length) {
        return NextResponse.json({ error: "One or more beds not found" }, { status: 404 });
      }

      for (const b of beds) {
        if (b.roomId.toString() !== roomId) {
          return NextResponse.json(
            { error: "Bed does not belong to this room" },
            { status: 400 },
          );
        }
        if (b.status !== "AVAILABLE") {
          return NextResponse.json(
            { error: `Bed ${b.bedLabel} is currently ${b.status}` },
            { status: 409 },
          );
        }
      }
    } else {
      const allBeds = await db
        .collection("rb_beds")
        .find({ roomId: new ObjectId(roomId) })
        .toArray();

      for (const b of allBeds) {
        if (b.status !== "AVAILABLE") {
          return NextResponse.json(
            { error: `Cannot reserve whole room — Bed ${b.bedLabel} is ${b.status}` },
            { status: 409 },
          );
        }
      }
      bedObjectIds = allBeds.map((b) => b._id);
    }

    const now = new Date();

    const doc = {
      roomId: new ObjectId(roomId),
      bedIds: bedObjectIds,
      reservationReasonCode,
      reservedFrom: from,
      reservedUntil: until,
      reservedNote: body.reservedNote || null,
      createdByStaffId: new ObjectId(auth.user.userId),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rb_reservations").insertOne(doc);

    await db.collection("rb_beds").updateMany(
      { _id: { $in: bedObjectIds } },
      {
        $set: {
          status: "RESERVED",
          notes: `Reserved for ${reason.name} until ${until.toDateString()}`,
          updatedAt: now,
        },
      },
    );

    await logAudit({
      action: "RESERVATION_CREATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_reservations",
      targetId: result.insertedId,
      ipAddress: getClientIP(req),
      details: {
        roomNumber: room.roomNumber,
        bedCount: bedObjectIds.length,
        reason: reservationReasonCode,
      },
    });

    return NextResponse.json(
      { success: true, reservationId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /reservations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}