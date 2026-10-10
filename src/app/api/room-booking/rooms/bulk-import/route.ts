// src/app/api/room-booking/rooms/bulk-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";

/**
 * POST /api/room-booking/rooms/bulk-import
 * Body: { rooms: [ { roomNumber, roomName, roomTypeCode, floor, areaSqm, amenities[], beds[] } ] }
 * Idempotent — skips duplicates by roomNumber.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const rooms = Array.isArray(body.rooms) ? body.rooms : [];

    if (rooms.length === 0) {
      return NextResponse.json({ error: "No rooms provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");
    const now = new Date();

    const results = {
      created: 0,
      skipped: 0,
      bedsCreated: 0,
      errors: [] as { room: string; error: string }[],
    };

    for (const r of rooms) {
      try {
        if (!r.roomNumber || !r.roomTypeCode) {
          results.errors.push({
            room: r.roomNumber || "(missing)",
            error: "roomNumber and roomTypeCode required",
          });
          continue;
        }

        const exists = await db
          .collection("rb_rooms")
          .findOne({ roomNumber: r.roomNumber });

        if (exists) {
          results.skipped++;
          continue;
        }

        const beds = Array.isArray(r.beds) ? r.beds : [];

        const roomDoc = {
          roomNumber: r.roomNumber,
          roomName: r.roomName || r.roomNumber,
          roomTypeCode: r.roomTypeCode,
          floor: Number(r.floor) || 1,
          areaSqm: Number(r.areaSqm) || 0,
          description: r.description || "",
          amenities: Array.isArray(r.amenities) ? r.amenities : [],
          photos: [],
          wifiPassword: r.wifiPassword || "",
          emergencyContact: r.emergencyContact || "",
          bedCount: beds.length,
          isResidentRoom: r.roomTypeCode === "RESIDENT",
          residentStaffId: null,
          status: "ACTIVE",
          qrCodeUrl: null,
          createdAt: now,
          updatedAt: now,
        };

        const insertRoom = await db.collection("rb_rooms").insertOne(roomDoc);
        results.created++;

        if (beds.length > 0) {
          const bedDocs = beds.map((b: any) => ({
            roomId: insertRoom.insertedId,
            roomNumber: r.roomNumber,
            bedLabel: b.bedLabel || b.label || "A",
            bedTypeCode: b.bedTypeCode || b.typeCode || "SINGLE",
            status: "AVAILABLE",
            currentBookingId: null,
            rates: b.rates || {
              tier1: 0,
              tier2: 0,
              tier3: 0,
              tier4: 0,
              tier5: 0,
            },
            notes: null,
            createdAt: now,
            updatedAt: now,
          }));
          await db.collection("rb_beds").insertMany(bedDocs);
          results.bedsCreated += bedDocs.length;
        }
      } catch (err: any) {
        results.errors.push({
          room: r.roomNumber || "(unknown)",
          error: err.message,
        });
      }
    }

    await logAudit({
      action: "BULK_IMPORT",
      performedByStaffId: auth.user.userId,
      targetType: "rb_rooms",
      ipAddress: getClientIP(req),
      details: { total: rooms.length, results },
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("POST /rooms/bulk-import error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
