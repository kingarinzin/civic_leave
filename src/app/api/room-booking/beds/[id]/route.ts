// src/app/api/room-booking/beds/[id]/route.ts
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
      return NextResponse.json({ error: "Invalid bed ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");
    const bed = await db.collection("rb_beds").findOne({ _id: new ObjectId(id) });
    if (!bed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      bed: {
        ...bed,
        _id: bed._id.toString(),
        roomId: bed.roomId.toString(),
        currentBookingId: bed.currentBookingId
          ? bed.currentBookingId.toString()
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /beds/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Invalid bed ID" }, { status: 400 });
    }

    const body = await req.json();
    delete body._id;
    delete body.roomId;
    delete body.createdAt;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db
      .collection("rb_beds")
      .findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const update: Record<string, any> = { ...body, updatedAt: new Date() };

    const result = await db
      .collection("rb_beds")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    await logAudit({
      action: before.status !== update.status ? "BED_STATUS_CHANGE" : "BED_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_beds",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before, after: body },
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUT /beds/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Invalid bed ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const bed = await db.collection("rb_beds").findOne({ _id: new ObjectId(id) });
    if (!bed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (bed.status === "OCCUPIED") {
      return NextResponse.json(
        { error: "Cannot delete a bed that is currently occupied." },
        { status: 409 },
      );
    }

    await db.collection("rb_beds").deleteOne({ _id: new ObjectId(id) });
    await db.collection("rb_rooms").updateOne(
      { _id: bed.roomId },
      { $inc: { bedCount: -1 }, $set: { updatedAt: new Date() } },
    );

    await logAudit({
      action: "BED_DELETE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_beds",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: bed },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /beds/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}