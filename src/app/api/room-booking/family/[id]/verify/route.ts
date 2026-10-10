// src/app/api/room-booking/family/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";
import { sendMail } from "@/lib/mailer";

/**
 * POST /api/room-booking/family/[id]/verify
 * Body: { action: "VERIFY" | "REJECT" | "REVOKE", remarks?: string }
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
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;
    if (!["VERIFY", "REJECT", "REVOKE"].includes(action)) {
      return NextResponse.json(
        { error: "action must be VERIFY, REJECT, or REVOKE" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const item = await db
      .collection("rb_family_registry")
      .findOne({ _id: new ObjectId(id) });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    const update: Record<string, any> = { updatedAt: now };

    if (action === "VERIFY") {
      if (item.status === "VERIFIED") {
        return NextResponse.json({ error: "Already verified" }, { status: 409 });
      }
      update.status = "VERIFIED";
      update.isLocked = true;
      update.lockedAt = now;
      update.verifiedByStaffId = new ObjectId(auth.user.userId);
      update.verifiedAt = now;
      update.verificationRemarks = body.remarks || null;
      update.rejectedReason = null;
    } else if (action === "REJECT") {
      update.status = "REJECTED";
      update.verifiedByStaffId = new ObjectId(auth.user.userId);
      update.verifiedAt = now;
      update.rejectedReason = body.remarks || "Not specified";
      update.isLocked = false;
    } else if (action === "REVOKE") {
      if (item.status !== "VERIFIED") {
        return NextResponse.json(
          { error: "Only verified records can be revoked" },
          { status: 409 },
        );
      }
      update.status = "REVOKED";
      update.revokedReason = body.remarks || "Not specified";
      update.isLocked = false;
      update.verifiedByStaffId = new ObjectId(auth.user.userId);
      update.verifiedAt = now;
    }

    await db
      .collection("rb_family_registry")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    await logAudit({
      action: `FAMILY_${action}`,
      performedByStaffId: auth.user.userId,
      targetType: "rb_family_registry",
      targetId: id,
      ipAddress: getClientIP(req),
      details: { before: item.status, after: update.status, remarks: body.remarks },
    });

    // Notify officer
    (async () => {
      try {
        const officer = await db
          .collection("users")
          .findOne({ _id: item.staffId });
        if (officer?.email) {
          const labels: Record<string, string> = {
            VERIFY: "VERIFIED",
            REJECT: "REJECTED",
            REVOKE: "REVOKED",
          };
          const statusLabel = labels[action];
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2>Family Verification Update</h2>
              <p>Dear <b>${officer.name || officer.email}</b>,</p>
              <p>Your family member <b>${item.fullName}</b> has been <b>${statusLabel}</b>.</p>
              ${body.remarks ? `<p><b>Remarks:</b> ${body.remarks}</p>` : ""}
            </div>
          `;
          await sendMail({
            to: officer.email,
            subject: `[Room Booking] Family ${statusLabel}: ${item.fullName}`,
            html,
          });
        }
      } catch (e) {
        console.error("[FAMILY VERIFY NOTIFY ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true, status: update.status });
  } catch (error: any) {
    console.error("POST /family/[id]/verify error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}