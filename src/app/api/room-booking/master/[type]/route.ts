// src/app/api/room-booking/master/[type]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

const ALLOWED_TYPES = new Set([
  "room-types",
  "bed-types",
  "amenities",
  "rate-tiers",
  "relationships",
  "proof-types",
  "reservation-reasons",
  "waiver-reasons",
]);

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
  if (!ALLOWED_TYPES.has(type)) return null;
  return TYPE_TO_COLLECTION[type];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { type } = await params;
    const col = getCollection(type);
    if (!col)
      return NextResponse.json({ error: "Invalid master type" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("civic_leave_db");
    const items = await db.collection(col).find({}).sort({ sortOrder: 1 }).toArray();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("GET master/[type] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { type } = await params;
    const col = getCollection(type);
    if (!col)
      return NextResponse.json({ error: "Invalid master type" }, { status: 400 });

    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Both 'code' and 'name' are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const existing = await db.collection(col).findOne({ code: body.code });
    if (existing) {
      return NextResponse.json(
        { error: `Master code '${body.code}' already exists` },
        { status: 409 },
      );
    }

    const now = new Date();
    const doc = {
      ...body,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? 999,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(col).insertOne(doc);

    await db.collection("rb_audit").insertOne({
      action: "MASTER_CREATE",
      performedByStaffId: auth.user.userId,
      targetType: col,
      targetId: result.insertedId,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      details: { doc },
      createdAt: now,
    });

    return NextResponse.json(
      { success: true, _id: result.insertedId },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST master/[type] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}