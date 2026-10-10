// src/app/api/room-booking/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/rates
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const beds = await db
      .collection("rb_beds")
      .find({})
      .sort({ roomNumber: 1, bedLabel: 1 })
      .toArray();
    const rooms = await db.collection("rb_rooms").find({}).toArray();

    const roomMap = Object.fromEntries(rooms.map((r) => [r._id.toString(), r]));

    return NextResponse.json({
      rates: beds.map((b) => ({
        _id: b._id.toString(),
        roomId: b.roomId.toString(),
        roomNumber: b.roomNumber,
        bedLabel: b.bedLabel,
        bedTypeCode: b.bedTypeCode,
        rates: b.rates || { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
        roomTypeCode: roomMap[b.roomId.toString()]?.roomTypeCode || null,
      })),
    });
  } catch (error: any) {
    console.error("GET /rates error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/room-booking/rates
 * Body: { updates: [ { bedId, rates: { tier1, tier2, tier3, tier4, tier5 } } ] }
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    let count = 0;
    const now = new Date();

    for (const u of updates) {
      if (!u.bedId || !u.rates) continue;
      if (!ObjectId.isValid(u.bedId)) continue;

      const before = await db
        .collection("rb_beds")
        .findOne({ _id: new ObjectId(u.bedId) });
      if (!before) continue;

      const clean: Record<string, number> = {};
      for (const k of ["tier1", "tier2", "tier3", "tier4", "tier5"]) {
        clean[k] = Number(u.rates[k] ?? 0);
      }

      await db.collection("rb_beds").updateOne(
        { _id: new ObjectId(u.bedId) },
        {
          $set: {
            rates: clean,
            updatedAt: now,
          },
        },
      );
      count++;
    }

    await logAudit({
      action: "RATE_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_beds",
      ipAddress: getClientIP(req),
      details: { count, updates },
    });

    return NextResponse.json({ success: true, updated: count });
  } catch (error: any) {
    console.error("PUT /rates error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}