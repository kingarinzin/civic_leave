// src/app/api/room-booking/bookings/[ref]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { sendMail } from "@/lib/mailer";
import { ObjectId } from "mongodb"; // ⭐ ADDED

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ref } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "";

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const booking = await db.collection("rb_bookings").findOne({ bookingRef: ref });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (
      !auth.user.isAdmin &&
      booking.bookedByStaffId.toString() !== auth.user.userId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (["CHECKED_OUT", "CANCELLED"].includes(booking.bookingStatus)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking that is ${booking.bookingStatus}` },
        { status: 409 },
      );
    }

    const now = new Date();

    await db.collection("rb_bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          bookingStatus: "CANCELLED",
          cancelledAt: now,
          cancelledReason: reason,
          cancelledByStaffId: new ObjectId(auth.user.userId),
          updatedAt: now,
        },
      },
    );

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

    await db.collection("rb_ledger").updateOne(
      { bookingId: booking._id, status: "UNPAID" },
      {
        $set: {
          status: "CANCELLED",
          settledAt: now,
          settledByStaffId: new ObjectId(auth.user.userId),
        },
      },
    );

    if (booking.approvalId) {
      await db.collection("rb_approvals").updateOne(
        { _id: booking.approvalId },
        { $set: { status: "CANCELLED", updatedAt: now } },
      );
    }

    await logAudit({
      action: "CANCEL",
      performedByStaffId: auth.user.userId,
      targetType: "rb_bookings",
      targetId: booking._id,
      ipAddress: getClientIP(req),
      details: { bookingRef: ref, reason },
    });

    (async () => {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#dc2626">❌ Booking Cancelled</h2>
            <p>Dear <b>${booking.bookedBySnapshot?.name || auth.user.name}</b>,</p>
            <p>Your booking <b>${ref}</b> has been cancelled.</p>
            ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
          </div>
        `;
        if (booking.bookedBySnapshot?.email) {
          await sendMail({
            to: booking.bookedBySnapshot.email,
            subject: `[Room Booking] Cancelled ${ref}`,
            html,
          });
        }
      } catch (e) {
        console.error("[CANCEL EMAIL ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /bookings/[ref]/cancel error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}