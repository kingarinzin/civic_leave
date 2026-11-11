// src/app/api/room-booking/master/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

const TYPE_TO_COLLECTION: Record<string, string> = {
  "room-types": "rb_room_types",
  "bed-types": "rb_bed_types",
  amenities: "rb_amenities",
  "rate-tiers": "rb_rate_tiers",
  relationships: "rb_relationships",
  "proof-types": "rb_proof_types",
  "reservation-reasons": "rb_reservation_reasons",
  "waiver-reasons": "rb_waiver_reasons",
};

function getCollection(type: string) {
  return TYPE_TO_COLLECTION[type] || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { type, id } = await params;
    const col = getCollection(type);
    if (!col)
      return NextResponse.json({ error: "Invalid master type" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("civic_leave_db");
    const item = await db.collection(col).findOne({ _id: new ObjectId(id) });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("GET master/[type]/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { type, id } = await params;
    const col = getCollection(type);
    if (!col)
      return NextResponse.json({ error: "Invalid master type" }, { status: 400 });

    const body = await req.json();
    delete body._id;
    delete body.createdAt;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db.collection(col).findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await db
      .collection(col)
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...body, updatedAt: new Date() } },
      );

    await db.collection("rb_audit").insertOne({
      action: "MASTER_UPDATE",
      performedByStaffId: auth.user.userId,
      targetType: col,
      targetId: new ObjectId(id),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      details: { before, after: body },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error("PUT master/[type]/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { type, id } = await params;
    const col = getCollection(type);
    if (!col)
      return NextResponse.json({ error: "Invalid master type" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const before = await db.collection(col).findOne({ _id: new ObjectId(id) });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db
      .collection(col)
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: false, updatedAt: new Date() } },
      );

    await db.collection("rb_audit").insertOne({
      action: "MASTER_DELETE",
      performedByStaffId: auth.user.userId,
      targetType: col,
      targetId: new ObjectId(id),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      details: { before },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE master/[type]/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}