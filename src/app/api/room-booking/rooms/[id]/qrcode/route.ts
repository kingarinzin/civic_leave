// src/app/api/room-booking/rooms/[id]/qrcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { generateRoomQR } from "@/lib/qr-generator";
import { ObjectId } from "mongodb";

/**
 * POST /api/room-booking/rooms/[id]/qrcode
 */
export async function POST(
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
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db
      .collection("rb_rooms")
      .findOne({ _id: new ObjectId(id) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { url, key } = await generateRoomQR(room.roomNumber);

    await db.collection("rb_rooms").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          qrCodeUrl: url,
          qrCodeKey: key,
          updatedAt: new Date(),
        },
      },
    );

    await logAudit({
      action: "ROOM_QR_GENERATE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { url, key },
    });

    return NextResponse.json({ success: true, url, key });
  } catch (error: any) {
    console.error("POST /rooms/[id]/qrcode error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}