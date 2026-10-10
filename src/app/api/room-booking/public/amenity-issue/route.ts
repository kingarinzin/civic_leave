// src/app/api/room-booking/public/amenity-issue/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendMail } from "@/lib/mailer";

/**
 * POST /api/room-booking/public/amenity-issue
 * Body: { roomNumber, amenityCode, description, reportedBy? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomNumber, amenityCode, description, reportedBy } = body;

    if (!roomNumber || !description) {
      return NextResponse.json(
        { error: "roomNumber and description are required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db.collection("rb_rooms").findOne({ roomNumber });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const amenity = amenityCode
      ? await db.collection("rb_amenities").findOne({ code: amenityCode })
      : null;

    const now = new Date();
    const doc = {
      roomId: room._id,
      roomNumber,
      amenityCode: amenityCode || "GENERAL",
      amenityName: amenity?.name || "General Issue",
      description,
      reportedBy: reportedBy || "Anonymous",
      status: "OPEN",
      createdAt: now,
    };

    const result = await db.collection("rb_amenity_issues").insertOne(doc);

    // Notify admins
    (async () => {
      try {
        const admins = await db
          .collection("users")
          .find({ isAdmin: true, isActive: { $ne: false } })
          .toArray();
        const adminEmails = admins.map((a) => a.email).filter(Boolean);

        if (adminEmails.length > 0) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#dc2626">🛠️ Amenity Issue Reported</h2>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Room</b></td><td style="padding:8px;border:1px solid #ddd">${roomNumber}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Amenity</b></td><td style="padding:8px;border:1px solid #ddd">${doc.amenityName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Reported By</b></td><td style="padding:8px;border:1px solid #ddd">${doc.reportedBy}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Description</b></td><td style="padding:8px;border:1px solid #ddd">${description}</td></tr>
              </table>
            </div>
          `;
          await sendMail({
            to: adminEmails,
            subject: `[Room Booking] Issue Reported — ${roomNumber}`,
            html,
          });
        }
      } catch (e) {
        console.error("[ISSUE NOTIFY ERROR]", e);
      }
    })();

    return NextResponse.json(
      { success: true, issueId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /public/amenity-issue error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}