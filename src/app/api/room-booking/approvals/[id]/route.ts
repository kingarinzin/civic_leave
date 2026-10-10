// src/app/api/room-booking/approvals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { sendMail } from "@/lib/mailer";
import { ObjectId } from "mongodb";

/**
 * POST /api/room-booking/approvals/[id]
 * Body: { action: "APPROVE" | "REJECT", remarks?, apicAgency?, approvalRefNo? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const canApprove =
      auth.user.isAdmin ||
      ["Commissioner", "Chairperson", "SecretaryService"].includes(auth.user.role);

    if (!canApprove) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;
    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const approval = await db
      .collection("rb_approvals")
      .findOne({ _id: new ObjectId(id) });
    if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (approval.status !== "PENDING") {
      return NextResponse.json(
        { error: `Already ${approval.status}` },
        { status: 409 },
      );
    }

    const now = new Date();
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await db.collection("rb_approvals").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: newStatus,
          apicStaffId: new ObjectId(auth.user.userId),
          apicAgency: body.apicAgency || null,
          approvalRefNo: body.approvalRefNo || null,
          approvalDate: now,
          remarks: body.remarks || null,
          updatedAt: now,
        },
      },
    );

    // Update the booking + bed statuses
    const booking = await db
      .collection("rb_bookings")
      .findOne({ _id: approval.bookingId });

    if (booking) {
      if (action === "APPROVE") {
        await db.collection("rb_bookings").updateOne(
          { _id: booking._id },
          { $set: { bookingStatus: "CONFIRMED", updatedAt: now } },
        );
        // Beds move from RESERVED → OCCUPIED
        await db.collection("rb_beds").updateMany(
          { _id: { $in: booking.bedIds || [] } },
          { $set: { status: "OCCUPIED", updatedAt: now } },
        );
      } else {
        await db.collection("rb_bookings").updateOne(
          { _id: booking._id },
          { $set: { bookingStatus: "CANCELLED", updatedAt: now, cancelledReason: body.remarks || "Rejected by APIC" } },
        );
        // Beds move from RESERVED → AVAILABLE
        await db.collection("rb_beds").updateMany(
          { _id: { $in: booking.bedIds || [] }, status: "RESERVED" },
          { $set: { status: "AVAILABLE", currentBookingId: null, updatedAt: now } },
        );
        // Cancel ledger entry
        await db.collection("rb_ledger").updateOne(
          { bookingId: booking._id, status: "UNPAID" },
          { $set: { status: "CANCELLED", settledAt: now } },
        );
      }
    }

    await logAudit({
      action: action === "APPROVE" ? "APPROVE" : "REJECT",
      performedByStaffId: auth.user.userId,
      targetType: "rb_approvals",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { bookingRef: booking?.bookingRef, remarks: body.remarks },
    });

    // Notify officer
    (async () => {
      try {
        if (booking?.bookedBySnapshot?.email) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2 style="color:${action === "APPROVE" ? "#059669" : "#dc2626"}">
                ${action === "APPROVE" ? "✅ Booking Approved" : "❌ Booking Rejected"}
              </h2>
              <p>Dear <b>${booking.bookedBySnapshot.name}</b>,</p>
              <p>Your stakeholder booking <b>${booking.bookingRef}</b> has been <b>${newStatus}</b>.</p>
              ${body.remarks ? `<p><b>Remarks:</b> ${body.remarks}</p>` : ""}
            </div>
          `;
          await sendMail({
            to: booking.bookedBySnapshot.email,
            subject: `[Room Booking] ${newStatus} ${booking.bookingRef}`,
            html,
          });
        }
      } catch (e) {
        console.error("[APPROVAL NOTIFY ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error("POST /approvals/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}