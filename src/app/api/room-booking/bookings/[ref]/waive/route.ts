// src/app/api/room-booking/bookings/[ref]/waive/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { sendMail } from "@/lib/mailer";
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
    const body = await req.json();
    const { reasonCode, note } = body;

    if (!reasonCode) {
      return NextResponse.json({ error: "reasonCode required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const booking = await db.collection("rb_bookings").findOne({ bookingRef: ref });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (booking.paymentStatus === "WAIVED") {
      return NextResponse.json({ error: "Already waived" }, { status: 409 });
    }

    const reason = await db.collection("rb_waiver_reasons").findOne({ code: reasonCode });
    const now = new Date();

    await db.collection("rb_bookings").updateOne(
      { _id: booking._id },
      {
        $set: {
          paymentStatus: "WAIVED",
          waiverReasonCode: reasonCode,
          waiverNote: note || null,
          approvedByWaiverStaffId: new ObjectId(auth.user.userId),
          updatedAt: now,
        },
      },
    );

    // Mark ledger as WAIVED
    await db.collection("rb_ledger").updateOne(
      { bookingId: booking._id },
      {
        $set: {
          status: "WAIVED",
          settledAt: now,
          settledByStaffId: new ObjectId(auth.user.userId),
        },
      },
    );

    await logAudit({
      action: "WAIVER_GRANT",
      performedByStaffId: auth.user.userId,
      targetType: "rb_bookings",
      targetId: booking._id,
      ipAddress: getClientIP(req),
      details: { bookingRef: ref, reasonCode, note, amount: booking.totalAmount },
    });

    // Notify officer
    (async () => {
      try {
        if (booking.bookedBySnapshot?.email) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#059669">✅ Waiver Granted</h2>
              <p>Dear <b>${booking.bookedBySnapshot.name}</b>,</p>
              <p>Your booking <b>${ref}</b> has been waived.</p>
              <p><b>Amount:</b> Nu. ${booking.totalAmount}</p>
              <p><b>Reason:</b> ${reason?.name || reasonCode}</p>
              ${note ? `<p><b>Note:</b> ${note}</p>` : ""}
            </div>
          `;
          await sendMail({
            to: booking.bookedBySnapshot.email,
            subject: `[Room Booking] Waiver Granted ${ref}`,
            html,
          });
        }
      } catch (e) {
        console.error("[WAIVER EMAIL ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /bookings/[ref]/waive error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}