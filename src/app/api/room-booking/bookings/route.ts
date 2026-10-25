// src/app/api/room-booking/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, canBook } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { createTransporter } from "@/lib/mailer";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const mine = searchParams.get("mine") === "true";

    const filter: Record<string, any> = {};
    if (status) filter.bookingStatus = status;

    if (!auth.user.isAdmin || mine) {
      filter.bookedByStaffId = new ObjectId(auth.user.userId);
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const bookings = await db
      .collection("rb_bookings")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        ...b,
        _id: b._id.toString(),
        bookedByStaffId: b.bookedByStaffId?.toString(),
        occupantId: b.occupantId?.toString(),
        roomId: b.roomId?.toString(),
        bedIds: (b.bedIds || []).map((id: any) => id.toString()),
        approvalId: b.approvalId ? b.approvalId.toString() : null,
      })),
    });
  } catch (error: any) {
    console.error("GET /bookings error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await canBook(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON payload received" }, { status: 400 });
    }

    if (!body.roomId || !ObjectId.isValid(body.roomId)) {
      return NextResponse.json({ error: "Valid roomId required" }, { status: 400 });
    }
    if (!Array.isArray(body.bedIds) || body.bedIds.length === 0) {
      return NextResponse.json({ error: "At least one bedId required" }, { status: 400 });
    }

    const guestsList = Array.isArray(body.guests) ? body.guests : [];
    if (guestsList.length === 0) {
      return NextResponse.json({ error: "At least one guest is required" }, { status: 400 });
    }

    // 🚨 FIXED: Ensure dates are valid and saved correctly
    for (const g of guestsList) {
      if (!g.checkIn || !g.checkOut) {
        return NextResponse.json({ error: `Dates missing for guest: ${g.fullName || 'Unknown'}` }, { status: 400 });
      }
      const gIn = new Date(g.checkIn);
      const gOut = new Date(g.checkOut);
      
      if (isNaN(gIn.getTime()) || isNaN(gOut.getTime())) {
         return NextResponse.json({ error: `Invalid date format for guest: ${g.fullName || 'Unknown'}` }, { status: 400 });
      }
      if (gOut <= gIn) {
        return NextResponse.json({ error: `Check-out must be after Check-in for guest: ${g.fullName || 'Unknown'}` }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const room = await db.collection("rb_rooms").findOne({ _id: new ObjectId(body.roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.status !== "ACTIVE") {
      return NextResponse.json({ error: `Room is ${room.status}` }, { status: 400 });
    }

    const bedObjectIds = body.bedIds.map((id: string) => new ObjectId(id));
    const beds = await db.collection("rb_beds").find({ _id: { $in: bedObjectIds } }).toArray();
    if (beds.length !== body.bedIds.length) {
      return NextResponse.json({ error: "One or more beds not found" }, { status: 404 });
    }

    for (const bed of beds) {
      if (bed.roomId.toString() !== body.roomId) {
        return NextResponse.json({ error: "Bed does not belong to selected room" }, { status: 400 });
      }
      if (bed.status !== "AVAILABLE") {
        return NextResponse.json({ error: `Bed ${bed.bedLabel} is ${bed.status}` }, { status: 409 });
      }
    }

    const minDate = new Date(Math.min(...guestsList.map((g: any) => new Date(g.checkIn).getTime())));
    const maxDate = new Date(Math.max(...guestsList.map((g: any) => new Date(g.checkOut).getTime())));

    const conflicts = await db
      .collection("rb_bookings")
      .find({
        bookingStatus: { $in: ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN"] },
        bedIds: { $in: bedObjectIds },
        "guests.checkIn": { $lt: maxDate },
        "guests.checkOut": { $gt: minDate },
      })
      .toArray();

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "One or more beds are already booked for these dates" },
        { status: 409 },
      );
    }

    const TIER_MAP: Record<string, string> = {
      RESIDENT_STAFF: "tier1",
      ACC_STAFF: "tier2",
      FAMILY: "tier3",
      CO_AGENCY: "tier4",
      STAKEHOLDER: "tier5",
    };
    const TIER_LABEL: Record<string, string> = {
      RESIDENT_STAFF: "TIER1",
      ACC_STAFF: "TIER2",
      FAMILY: "TIER3",
      CO_AGENCY: "TIER4",
      STAKEHOLDER: "TIER5",
    };

    let totalAmount = 0;
    let hasApprovalRequirement = false; // Covers both CO_AGENCY and STAKEHOLDER
    const processedGuests = [];

    for (const guest of guestsList) {
      const type = guest.occupantType || "ACC_STAFF";
      
      // If any guest is Co-Agency or Stakeholder, we need approval
      if (type === "STAKEHOLDER" || type === "CO_AGENCY") {
        hasApprovalRequirement = true;
      }
      
      const tierKey = TIER_MAP[type] || "tier2";
      const rateTier = TIER_LABEL[type] || "TIER2";

      let ratePerBed = 0;
      beds.forEach((b: any) => {
        const rate = Number(b.rates?.[tierKey] || 0);
        if (rate > ratePerBed) ratePerBed = rate;
      });

      const gCheckIn = new Date(guest.checkIn);
      const gCheckOut = new Date(guest.checkOut);
      const gNights = Math.max(1, Math.ceil((gCheckOut.getTime() - gCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
      
      const guestTotal = ratePerBed * gNights;
      totalAmount += guestTotal;

      processedGuests.push({
        ...guest,
        rateTier,
        ratePerBed,
        nights: gNights,
        totalAmount: guestTotal,
        parsedCheckIn: gCheckIn,
        parsedCheckOut: gCheckOut
      });
    }

    const year = new Date().getFullYear();
    const count = await db.collection("rb_bookings").countDocuments({});
    const bookingRef = `ACC/PRO/BK/${year}/${String(count + 1).padStart(4, "0")}`;

    const now = new Date();

    const occupantIds = [];
    for (const guest of processedGuests) {
      const occupantDoc = {
        fullName: guest.fullName || auth.user.name,
        idType: "EMPLOYEE_ID",
        idNumber: guest.familyRegistryId || "",
        occupantType: guest.occupantType,
        familyRegistryId: guest.familyRegistryId ? new ObjectId(guest.familyRegistryId) : null,
        relationship: guest.relationship || null,
        agencyName: guest.agencyName || null,
        designation: guest.designation || null,
        contactNo: guest.contactNo || null,
        email: auth.user.email,
        staffId: (guest.occupantType === "ACC_STAFF" || guest.occupantType === "RESIDENT_STAFF") 
          ? new ObjectId(auth.user.userId) 
          : null,
        createdAt: now,
      };
      
      const insertResult = await db.collection("rb_occupants").insertOne(occupantDoc);
      occupantIds.push(insertResult.insertedId);
    }

    const primaryOccupantType = processedGuests[0]?.occupantType || "ACC_STAFF";
    
    const bookingDoc = {
      bookingRef,
      bookedByStaffId: new ObjectId(auth.user.userId),
      bookedBySnapshot: {
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.role,
      },
      occupantId: occupantIds[0],
      occupantIds: occupantIds,
      occupantSnapshot: {
        fullName: processedGuests[0]?.fullName || auth.user.name,
        occupantType: primaryOccupantType,
      },
      roomId: room._id,
      roomNumberSnapshot: room.roomNumber,
      bedIds: bedObjectIds,
      bookingScope: body.bookingScope || (beds.length === 1 ? "SINGLE_BED" : "WHOLE_ROOM"),
      guests: processedGuests.map(g => ({
        fullName: g.fullName,
        occupantType: g.occupantType,
        checkIn: g.parsedCheckIn.toISOString(),
        checkOut: g.parsedCheckOut.toISOString(),
        nights: g.nights,
        rateApplied: g.ratePerBed,
        totalAmount: g.totalAmount,
        rateTier: g.rateTier
      })),
      guestsCount: processedGuests.length,
      purpose: body.purpose || "",
      totalAmount,
      paymentStatus: "PENDING",
      paymentMode: "M_BOB",
      approvalId: null,
      bookingStatus: hasApprovalRequirement ? "PENDING_APPROVAL" : "CONFIRMED",
      createdAt: now,
      updatedAt: now,
    };

    const bookingInsert = await db.collection("rb_bookings").insertOne(bookingDoc);

    const newBedStatus = hasApprovalRequirement ? "RESERVED" : "OCCUPIED";
    await db.collection("rb_beds").updateMany(
      { _id: { $in: bedObjectIds } },
      {
        $set: {
          status: newBedStatus,
          currentBookingId: bookingInsert.insertedId,
          updatedAt: now,
        },
      },
    );

    for (const g of processedGuests) {
      await db.collection("rb_ledger").insertOne({
        bookingId: bookingInsert.insertedId,
        staffId: new ObjectId(auth.user.userId),
        guestName: g.fullName,
        description: `Room Booking for ${g.fullName} (${g.nights} nights)`,
        amount: g.totalAmount,
        type: "BOOKING",
        status: "UNPAID",
        dueDate: g.parsedCheckOut,
        settledAt: null,
        settledByStaffId: null,
        createdAt: now,
      });
    }

    let approverEmail = "";
    let divisionHeadEmail = "";
    let deptHeadEmail = "";
    let roomAdminEmail = "";
    let approvalToken = "";

    if (hasApprovalRequirement) {
      // 1. Find the Active Approver (Commissioner)
      const activeApprover = await db.collection("users").findOne({ isRoomBookingApprover: true });
      if (activeApprover) approverEmail = activeApprover.email;

      // 2. Find the Division Head
      const divHead = await db.collection("users").findOne({ role: "DivisionHead" });
      if (divHead) divisionHeadEmail = divHead.email;

      // 3. Find the Department Head
      const deptHead = await db.collection("users").findOne({ role: "DepartmentHead" });
      if (deptHead) deptHeadEmail = deptHead.email;

      // 4. Find the Room Admin
      const roomAdmin = await db.collection("users").findOne({ isRoomBookingAdmin: true });
      if (roomAdmin) roomAdminEmail = roomAdmin.email;

      // 5. Generate the Approval Token
      approvalToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 72);

      // 6. Save the Token
      await db.collection("rb_action_tokens").insertOne({
        token: approvalToken,
        bookingId: bookingInsert.insertedId,
        approverId: activeApprover ? activeApprover._id : null,
        used: false,
        expiresAt: tokenExpiry,
        createdAt: now,
      });

      // 7. Create Approval Record
      await db.collection("rb_approvals").insertOne({
        bookingId: bookingInsert.insertedId,
        requestedByStaffId: new ObjectId(auth.user.userId),
        assignedApproverId: activeApprover ? activeApprover._id : null,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAudit({
      action: "BOOK",
      performedByStaffId: auth.user.userId,
      targetType: "rb_bookings",
      targetId: bookingInsert.insertedId,
      ipAddress: getClientIP(req),
      details: {
        bookingRef,
        roomNumber: room.roomNumber,
        beds: beds.map((b: any) => b.bedLabel),
        guestsCount: processedGuests.length,
        totalAmount,
      },
    });

    // ==========================================
    // SEND EMAILS
    // ==========================================
    (async () => {
      try {
        const transporter = createTransporter();
        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        
        // 1. SEND APPROVAL EMAIL TO COMMISSIONER
        if (hasApprovalRequirement && approverEmail && approvalToken) {
          const approveLink = `${baseUrl}/api/room-booking/approvals/email-action?bookingId=${bookingInsert.insertedId}&token=${approvalToken}&action=approve`;
          const rejectLink = `${baseUrl}/api/room-booking/approvals/email-action?bookingId=${bookingInsert.insertedId}&token=${approvalToken}&action=reject`;

          const ccList = [auth.user.email, divisionHeadEmail, deptHeadEmail, roomAdminEmail].filter(Boolean);

          const approvalHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#f4f7fc; font-family: 'Segoe UI', Arial, sans-serif;">
  <table align="center" width="100%" style="max-width:600px; background:#ffffff; margin:20px auto; border-radius:8px;">
    <tr>
      <td style="padding:30px; text-align:center; border-bottom:1px solid #E5E7EB;">
        <h2 style="color:#4F46E5; margin:0;">Room Booking Approval Required</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <p>Hello <strong>Commissioner</strong>,</p>
        <p>You have a new room booking request awaiting your action.</p>
        
        <div style="background:#F3F4F6; padding:15px; border-radius:8px; margin:20px 0;">
          <table style="width:100%; border-collapse:collapse; font-size:15px;">
            <tr><td style="padding:6px; font-weight:600; width:40%;">Booking Ref:</td><td>${bookingRef}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Requested By:</td><td>${auth.user.name}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Room:</td><td>${room.roomNumber}</td></tr>
            <tr><td style="padding:6px; font-weight:600;">Total Cost:</td><td>Nu. ${totalAmount}</td></tr>
          </table>
        </div>

        ${body.purpose ? `
          <div style="background:#F9FAFB; padding:12px; border-left:4px solid #4F46E5; margin:15px 0;">
            <p style="margin:0;"><strong>Purpose:</strong><br>${body.purpose}</p>
          </div>
        ` : ''}

        <div style="margin:30px 0; text-align:center;">
          <a href="${approveLink}" style="background:#4F46E5; color:#fff; padding:12px 30px; text-decoration:none; border-radius:6px; margin-right:10px; display:inline-block;">Approve</a>
          <a href="${rejectLink}" style="background:#dc3545; color:#fff; padding:12px 30px; text-decoration:none; border-radius:6px; display:inline-block;">Reject</a>
        </div>
        
        <p style="font-size:12px; color:#9CA3AF; margin-top:25px;">
          This email was CC'd to the Division Head, Department Head, and Room Admin.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
          `;

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: approverEmail,
            cc: ccList,
            subject: `[Action Required] Room Booking Approval - ${bookingRef}`,
            html: approvalHtml,
          });
        }

        // 2. SEND CONFIRMATION TO USER
        let guestRows = processedGuests.map(g => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd">${g.fullName}</td>
            <td style="padding:8px;border:1px solid #ddd">${g.parsedCheckIn.toDateString()} to ${g.parsedCheckOut.toDateString()}</td>
            <td style="padding:8px;border:1px solid #ddd">Nu. ${g.totalAmount}</td>
          </tr>
        `).join("");

        const userHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#059669">✅ Booking ${hasApprovalRequirement ? "Submitted" : "Confirmed"}</h2>
            <p>Dear <b>${auth.user.name}</b>,</p>
            <p>Your room booking has been ${hasApprovalRequirement ? "submitted for approval" : "confirmed"}.</p>
            ${hasApprovalRequirement ? "<p style='color:#d97706'><b>Note:</b> This booking requires approval from the Commissioner.</p>" : ""}
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <thead style="background:#f9fafb">
                <tr>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Guest</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Dates</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Total</th>
                </tr>
              </thead>
              <tbody>${guestRows}</tbody>
            </table>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: auth.user.email,
          subject: `[Room Booking] ${hasApprovalRequirement ? "Submitted" : "Confirmed"} ${bookingRef}`,
          html: userHtml,
        });

      } catch (e) {
        console.error("[BOOKING EMAIL ERROR]", e);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        bookingRef,
        bookingId: bookingInsert.insertedId.toString(),
        bookingStatus: bookingDoc.bookingStatus,
        totalAmount,
        guestsCount: processedGuests.length,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /bookings error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}