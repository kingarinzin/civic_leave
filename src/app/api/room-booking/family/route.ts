// src/app/api/room-booking/family/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, verifyBookingAdmin } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { ObjectId } from "mongodb";
import { sendMail } from "@/lib/mailer";

/**
 * POST /api/room-booking/family
 * Officer submits a family member for verification.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    const required = ["fullName", "relationshipCode", "cid"];
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json({ error: `${f} is required` }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // Duplicate CID check across ALL registries
    const dup = await db
      .collection("rb_family_registry")
      .findOne({ cid: body.cid });
    if (dup) {
      return NextResponse.json(
        { error: `CID ${body.cid} is already registered` },
        { status: 409 },
      );
    }

    // Relationship validity
    const rel = await db
      .collection("rb_relationships")
      .findOne({ code: body.relationshipCode, isActive: { $ne: false } });
    if (!rel) {
      return NextResponse.json(
        { error: `Invalid relationship: ${body.relationshipCode}` },
        { status: 400 },
      );
    }

    const now = new Date();

    const doc = {
      staffId: new ObjectId(auth.user.userId),
      staffSnapshot: {
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.role,
        departmentId: auth.user.departmentId || null,
        divisionId: auth.user.divisionId || null,
      },
      fullName: body.fullName,
      relationshipCode: body.relationshipCode,
      relationshipOther: body.relationshipOther || null,
      cid: body.cid,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      contactNo: body.contactNo || null,
      proofDocumentUrl: body.proofDocumentUrl || null,
      proofDocumentTypeCode: body.proofDocumentTypeCode || null,
      remarks: body.remarks || null,
      status: "PENDING",
      verifiedByStaffId: null,
      verifiedAt: null,
      verificationRemarks: null,
      rejectedReason: null,
      revokedReason: null,
      isLocked: false,
      lockedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("rb_family_registry").insertOne(doc);

    await logAudit({
      action: "FAMILY_SUBMIT",
      performedByStaffId: auth.user.userId,
      targetType: "rb_family_registry",
      targetId: result.insertedId,
      ipAddress: getClientIP(req),
      details: { familyMember: doc.fullName, relationship: doc.relationshipCode },
    });

    // Notify admins (fire & forget)
    (async () => {
      try {
        const admins = await db
          .collection("users")
          .find({ isAdmin: true, isActive: { $ne: false } })
          .toArray();

        const adminEmails = admins.map((a) => a.email).filter(Boolean);

        if (adminEmails.length > 0) {
          const relName = rel.name || doc.relationshipCode;
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
              <h2>📋 New Family Verification Request</h2>
              <p>A new family verification request has been submitted.</p>
              <table style="border-collapse:collapse;width:100%">
                <tr><td style="padding:8px;border:1px solid #eee"><b>Officer</b></td><td style="padding:8px;border:1px solid #eee">${auth.user.name} (${auth.user.email})</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><b>Family Member</b></td><td style="padding:8px;border:1px solid #eee">${doc.fullName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><b>Relationship</b></td><td style="padding:8px;border:1px solid #eee">${relName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><b>CID</b></td><td style="padding:8px;border:1px solid #eee">${doc.cid}</td></tr>
              </table>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/room-booking/admin/family-verifications">Review queue</a></p>
            </div>
          `;
          await sendMail({
            to: adminEmails,
            subject: `[Room Booking] Family Verification: ${doc.fullName}`,
            html,
          });
        }
      } catch (e) {
        console.error("[FAMILY SUBMIT NOTIFY ERROR]", e);
      }
    })();

    return NextResponse.json(
      { success: true, familyId: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /family error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/room-booking/family?status=&staffId=
 * Admin-only list. Staff see only their own.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");

    const filter: Record<string, any> = {};

    if (!auth.user.isAdmin) {
      // Non-admin sees only their own
      filter.staffId = new ObjectId(auth.user.userId);
    } else if (staffId && ObjectId.isValid(staffId)) {
      filter.staffId = new ObjectId(staffId);
    }

    if (status) filter.status = status;

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const items = await db
      .collection("rb_family_registry")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      items: items.map((i) => ({
        ...i,
        _id: i._id.toString(),
        staffId: i.staffId.toString(),
        verifiedByStaffId: i.verifiedByStaffId
          ? i.verifiedByStaffId.toString()
          : null,
      })),
    });
  } catch (error: any) {
    console.error("GET /family error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}