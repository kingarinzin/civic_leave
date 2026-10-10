// src/app/api/room-booking/residents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

export async function GET(
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
    const resident = await db.collection("rb_residents").findOne({ _id: new ObjectId(id) });
    if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [staff, room, bed] = await Promise.all([
      db.collection("users").findOne({ _id: resident.staffId }),
      db.collection("rb_rooms").findOne({ _id: resident.roomId }),
      resident.bedId ? db.collection("rb_beds").findOne({ _id: resident.bedId }) : null,
    ]);

    return NextResponse.json({
      resident: {
        ...resident,
        _id: resident._id.toString(),
        staffId: resident.staffId.toString(),
        roomId: resident.roomId.toString(),
        bedId: resident.bedId?.toString() || null,
      },
      staff: staff
        ? { _id: staff._id.toString(), name: staff.name, email: staff.email, cid: staff.cid }
        : null,
      room: room
        ? { _id: room._id.toString(), roomNumber: room.roomNumber, roomTypeCode: room.roomTypeCode }
        : null,
      bed: bed
        ? { _id: bed._id.toString(), bedLabel: bed.bedLabel, bedTypeCode: bed.bedTypeCode }
        : null,
    });
  } catch (error: any) {
    console.error("GET /residents/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/room-booking/residents/[id]
 * Body: { rateType?, rateValue? }  (only rate fields editable)
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
    const allowed = ["rateType", "rateValue"];
    const update: Record<string, any> = { updatedAt: new Date() };
    for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];

    if (update.rateValue !== undefined) update.rateValue = Number(update.rateValue);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db.collection("rb_residents").findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await db
      .collection("rb_residents")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    await logAudit({
      action: "RESIDENT_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_residents",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before, after: body },
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUT /residents/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/room-booking/residents/[id]
 * Release resident → bed becomes AVAILABLE, room unmarked as resident.
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

    const resident = await db.collection("rb_residents").findOne({ _id: new ObjectId(id) });
    if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();

    // Mark resident as RELEASED
    await db.collection("rb_residents").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "RELEASED",
          releasedAt: now,
          updatedAt: now,
        },
      },
    );

    // Free the bed
    if (resident.bedId) {
      await db.collection("rb_beds").updateOne(
        { _id: resident.bedId },
        {
          $set: {
            status: "AVAILABLE",
            notes: null,
            updatedAt: now,
          },
        },
      );
    }

    // Unmark room as resident room (only if no other active resident on it)
    const otherActive = await db.collection("rb_residents").countDocuments({
      roomId: resident.roomId,
      status: "ACTIVE",
      _id: { $ne: new ObjectId(id) },
    });

    if (otherActive === 0) {
      await db.collection("rb_rooms").updateOne(
        { _id: resident.roomId },
        {
          $set: {
            isResidentRoom: false,
            residentStaffId: null,
            updatedAt: now,
          },
        },
      );
    }

    await logAudit({
      action: "RESIDENT_RELEASE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_residents",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: resident },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /residents/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}