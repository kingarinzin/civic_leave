// src/app/api/room-booking/bookings/[ref]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";

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

    if (booking.bookingStatus !== "CHECKED_IN") {
      return NextResponse.json(
        { error: "Booking is not checked in" },
        { status: 409 },
      );
    }

    const now = new Date();

    await db.collection("rb_bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          bookingStatus: "CHECKED_OUT",
          checkOutAt: now,
          updatedAt: now,
        },
      },
    );

    // Release beds
    await db.collection("rb_beds").updateMany(
      { currentBookingId: booking._id },
      {
        $set: {
          status: "AVAILABLE",
          currentBookingId: null,
          updatedAt: now,
        },
      },
    );

    await logAudit({
      action: "CHECKOUT",
      performedByStaffId: auth.user.userId,
      targetType: "rb_bookings",
      targetId: booking._id,
      ipAddress: getClientIP(req),
      details: { bookingRef: ref },
    });

    return NextResponse.json({ success: true, checkOutAt: now });
  } catch (error: any) {
    console.error("POST /bookings/[ref]/checkout error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}