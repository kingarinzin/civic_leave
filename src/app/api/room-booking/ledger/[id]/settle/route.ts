// src/app/api/room-booking/ledger/[id]/settle/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { sendMail } from "@/lib/mailer";
import { ObjectId } from "mongodb";

/**
 * POST /api/room-booking/ledger/[id]/settle
 * Marks the ledger entry as PAID and updates the booking's paymentStatus.
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
      return NextResponse.json({ error: "Invalid ledger ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const entry = await db.collection("rb_ledger").findOne({ _id: new ObjectId(id) });
    if (!entry) return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });

    if (entry.status === "PAID") {
      return NextResponse.json({ error: "Already settled" }, { status: 409 });
    }
    if (entry.status === "WAIVED") {
      return NextResponse.json({ error: "Entry was waived, cannot settle" }, { status: 409 });
    }

    const now = new Date();

    await db.collection("rb_ledger").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "PAID",
          settledAt: now,
          settledByStaffId: new ObjectId(auth.user.userId),
        },
      },
    );

    // Update booking's paymentStatus if a booking reference exists
    if (entry.bookingId) {
      await db.collection("rb_bookings").updateOne(
        { _id: entry.bookingId },
        { $set: { paymentStatus: "PAID", updatedAt: now } },
      );
    }

    await logAudit({
      action: "LEDGER_SETTLE",
      performedByStaffId: auth.user.userId,
      targetType: "rb_ledger",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { amount: entry.amount, staffId: entry.staffId?.toString() },
    });

    // Notify officer
    (async () => {
      try {
        const staff = await db.collection("users").findOne({ _id: entry.staffId });
        if (staff?.email) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#059669">✅ Payment Received</h2>
              <p>Dear <b>${staff.name || staff.email}</b>,</p>
              <p>Your room booking bill of <b>Nu. ${entry.amount}</b> has been settled.</p>
            </div>
          `;
          await sendMail({
            to: staff.email,
            subject: `[Room Booking] Payment Received — Nu. ${entry.amount}`,
            html,
          });
        }
      } catch (e) {
        console.error("[LEDGER SETTLE EMAIL ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /ledger/[id]/settle error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}