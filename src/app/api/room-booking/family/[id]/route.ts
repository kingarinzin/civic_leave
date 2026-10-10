// src/app/api/room-booking/family/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

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
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");
    const item = await db
      .collection("rb_family_registry")
      .findOne({ _id: new ObjectId(id) });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Access: owner or admin
    if (
      !auth.user.isAdmin &&
      item.staffId.toString() !== auth.user.userId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      item: {
        ...item,
        _id: item._id.toString(),
        staffId: item.staffId.toString(),
        verifiedByStaffId: item.verifiedByStaffId
          ? item.verifiedByStaffId.toString()
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /family/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const item = await db
      .collection("rb_family_registry")
      .findOne({ _id: new ObjectId(id) });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only owner or admin
    if (
      !auth.user.isAdmin &&
      item.staffId.toString() !== auth.user.userId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Cannot delete if VERIFIED (needs REVOKE instead)
    if (item.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Verified records cannot be deleted. Ask Admin to revoke." },
        { status: 409 },
      );
    }

    // Cannot delete if used in any booking
    const usedInBooking = await db
      .collection("rb_bookings")
      .countDocuments({ "occupantSnapshot.familyRegistryId": new ObjectId(id) });
    if (usedInBooking > 0) {
      return NextResponse.json(
        { error: "This record is referenced in bookings and cannot be deleted." },
        { status: 409 },
      );
    }

    await db.collection("rb_family_registry").deleteOne({ _id: new ObjectId(id) });

    await logAudit({
      action: "FAMILY_DELETE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_family_registry",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: item },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /family/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}