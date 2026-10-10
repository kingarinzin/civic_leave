// src/app/api/room-booking/rooms/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { uploadFile, deleteFile } from "@/lib/storage";
import { ObjectId } from "mongodb";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/room-booking/rooms/[id]/upload
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFile(buffer, {
      folder: `rooms/${room.roomNumber}`,
      originalName: file.name,
      contentType: file.type,
    });

    const photoEntry = {
      url: result.url,
      key: result.key,
      order: (room.photos?.length || 0) + 1,
      isPrimary: (room.photos?.length || 0) === 0,
      uploadedAt: new Date(),
    };

    await db.collection("rb_rooms").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { photos: photoEntry } as any,
        $set: { updatedAt: new Date() },
      },
    );

    await logAudit({
      action: "ROOM_PHOTO_UPLOAD",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { photoEntry, fileSize: file.size },
    });

    return NextResponse.json({ success: true, photo: photoEntry });
  } catch (error: any) {
    console.error("POST /rooms/[id]/upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/room-booking/rooms/[id]/upload?key=<photoKey>
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
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    await deleteFile(key);

    await db.collection("rb_rooms").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { photos: { key } } as any,
        $set: { updatedAt: new Date() },
      },
    );

    await logAudit({
      action: "ROOM_PHOTO_DELETE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /rooms/[id]/upload error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}