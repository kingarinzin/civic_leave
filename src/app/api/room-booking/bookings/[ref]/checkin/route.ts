// src/app/api/room-booking/bookings/[ref]/checkin/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ref } = await params;
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const booking = await db.collection("rb_bookings").findOne({ bookingRef: ref });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (booking.bookingStatus !== "CONFIRMED") {
      return NextResponse.json(
        { error: `Cannot check in from status ${booking.bookingStatus}` },
        { status: 409 },
      );
    }

    const now = new Date();

    await db.collection("rb_bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          bookingStatus: "CHECKED_IN",
          checkInAt: now,
          updatedAt: now,
        },
      },
    );

    await logAudit({
      action: "CHECKIN",
      performedByStaffId: auth.user.userId,
      targetType: "rb_bookings",
      targetId: booking._id,
      ipAddress: getClientIP(req),
      details: { bookingRef: ref },
    });

    return NextResponse.json({ success: true, checkInAt: now });
  } catch (error: any) {
    console.error("POST /bookings/[ref]/checkin error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}