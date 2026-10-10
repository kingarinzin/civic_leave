// src/app/api/room-booking/reservations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

/**
 * PUT /api/room-booking/reservations/[id]
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
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const update: Record<string, any> = { updatedAt: new Date() };

    if (body.reservedUntil) update.reservedUntil = new Date(body.reservedUntil);
    if (body.reservedNote !== undefined) update.reservedNote = body.reservedNote;
    if (body.reservationReasonCode) update.reservationReasonCode = body.reservationReasonCode;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db.collection("rb_reservations").findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await db
      .collection("rb_reservations")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    if (
      body.reservationReasonCode &&
      body.reservationReasonCode !== before.reservationReasonCode
    ) {
      const reason = await db
        .collection("rb_reservation_reasons")
        .findOne({ code: body.reservationReasonCode });
      await db.collection("rb_beds").updateMany(
        { _id: { $in: before.bedIds || [] } },
        {
          $set: {
            notes: `Reserved for ${reason?.name || body.reservationReasonCode}`,
            updatedAt: new Date(),
          },
        },
      );
    }

    await logAudit({
      action: "RESERVATION_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_reservations",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before, after: body },
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUT /reservations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/room-booking/reservations/[id]
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
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const reservation = await db
      .collection("rb_reservations")
      .findOne({ _id: new ObjectId(id) });
    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();

    await db.collection("rb_beds").updateMany(
      {
        _id: { $in: reservation.bedIds || [] },
        status: "RESERVED",
      },
      {
        $set: {
          status: "AVAILABLE",
          notes: null,
          updatedAt: now,
        },
      },
    );

    await db.collection("rb_reservations").deleteOne({ _id: new ObjectId(id) });

    await logAudit({
      action: "RESERVATION_RELEASE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_reservations",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: reservation },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /reservations/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}