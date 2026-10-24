// src/app/api/room-booking/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser, canBook } from "@/lib/room-booking-auth";
import { logAudit, getClientIP } from "@/lib/rb-audit";
import { sendMail } from "@/lib/mailer";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/bookings?status=&mine=
 */
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

    // Non-admin sees only their own (unless explicitly requesting all as admin)
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

/**
 * POST /api/room-booking/bookings
 * Body: {
 *   occupant: {
 *     occupantType: "ACC_STAFF" | "FAMILY" | "CO_AGENCY" | "STAKEHOLDER" | "RESIDENT_STAFF",
 *     fullName, idType, idNumber, relationship?, familyRegistryId?, agencyName?, designation?, contactNo?, email?
 *   },
 *   roomId,
 *   bedIds: [ "..." ],   // 1 bed (single) or all beds in room (whole-room)
 *   bookingScope: "SINGLE_BED" | "WHOLE_ROOM",
 *   checkIn, checkOut,
 *   purpose, caseRefNo?,
 *   paymentMode: "PAYROLL_DEDUCTION" | "M_BOB" | "CASH"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Pending-bill gate + role check
    const auth = await canBook(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.occupant?.occupantType) {
      return NextResponse.json({ error: "occupant.occupantType required" }, { status: 400 });
    }
    if (!body.roomId || !ObjectId.isValid(body.roomId)) {
      return NextResponse.json({ error: "Valid roomId required" }, { status: 400 });
    }
    if (!Array.isArray(body.bedIds) || body.bedIds.length === 0) {
      return NextResponse.json({ error: "At least one bedId required" }, { status: 400 });
    }
    if (!body.checkIn || !body.checkOut) {
      return NextResponse.json({ error: "checkIn and checkOut required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const occupantType = body.occupant.occupantType;

    // Validate permissions by occupant type
    if (occupantType === "STAKEHOLDER" && !auth.user.isAdmin) {
      const allowed = ["Commissioner", "Chairperson", "SecretaryService"].includes(auth.user.role);
      if (!allowed) {
        return NextResponse.json(
          { error: "Only Commissioner/Chairperson/SecretaryService can book for stakeholders" },
          { status: 403 },
        );
      }
    }

    // Validate FAMILY occupant → must be verified
    let familyRegistry = null;
    if (occupantType === "FAMILY") {
      if (!body.occupant.familyRegistryId) {
        return NextResponse.json(
          { error: "familyRegistryId required for FAMILY bookings" },
          { status: 400 },
        );
      }
      if (!ObjectId.isValid(body.occupant.familyRegistryId)) {
        return NextResponse.json({ error: "Invalid familyRegistryId" }, { status: 400 });
      }
      familyRegistry = await db.collection("rb_family_registry").findOne({
        _id: new ObjectId(body.occupant.familyRegistryId),
      });
      if (!familyRegistry) {
        return NextResponse.json({ error: "Family registry not found" }, { status: 404 });
      }
      if (familyRegistry.status !== "VERIFIED") {
        return NextResponse.json(
          { error: "Family member is not verified. Cannot book at family rate." },
          { status: 403 },
        );
      }
      // Verify ownership
      if (!auth.user.isAdmin && familyRegistry.staffId.toString() !== auth.user.userId) {
        return NextResponse.json(
          { error: "You can only book for your own verified family members" },
          { status: 403 },
        );
      }
    }

    // Get room
    const room = await db.collection("rb_rooms").findOne({ _id: new ObjectId(body.roomId) });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.status !== "ACTIVE") {
      return NextResponse.json({ error: `Room is ${room.status}` }, { status: 400 });
    }

    // Get beds
    const bedObjectIds = body.bedIds.map((id: string) => new ObjectId(id));
    const beds = await db.collection("rb_beds").find({ _id: { $in: bedObjectIds } }).toArray();
    if (beds.length !== body.bedIds.length) {
      return NextResponse.json({ error: "One or more beds not found" }, { status: 404 });
    }

    // Verify beds belong to room
    for (const bed of beds) {
      if (bed.roomId.toString() !== body.roomId) {
        return NextResponse.json({ error: "Bed does not belong to selected room" }, { status: 400 });
      }
      if (bed.status !== "AVAILABLE") {
        return NextResponse.json(
          { error: `Bed ${bed.bedLabel} is ${bed.status}` },
          { status: 409 },
        );
      }
    }

    // Check date conflicts
    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
    }

    const conflicts = await db
      .collection("rb_bookings")
      .find({
        bookingStatus: { $in: ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN"] },
        bedIds: { $in: bedObjectIds },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
      })
      .toArray();

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "One or more beds are already booked for these dates" },
        { status: 409 },
      );
    }

    // Rate engine
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

    const tierKey = TIER_MAP[occupantType] || "tier2";
    const rateTier = TIER_LABEL[occupantType] || "TIER2";

    const ratePerBed = beds.reduce(
      (sum: number, b: any) => sum + Number(b.rates?.[tierKey] || 0),
      0,
    );

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    const totalAmount = ratePerBed * nights;

    // Generate booking reference
    const year = new Date().getFullYear();
    const count = await db.collection("rb_bookings").countDocuments({});
    const bookingRef = `ACC/PRO/BK/${year}/${String(count + 1).padStart(4, "0")}`;

    const now = new Date();

    // Create occupant record
    const occupantDoc = {
      fullName: body.occupant.fullName || auth.user.name,
      idType: body.occupant.idType || "EMPLOYEE_ID",
      idNumber: body.occupant.idNumber || "",
      occupantType,
      familyRegistryId: familyRegistry?._id || null,
      relationship: familyRegistry?.relationshipCode || body.occupant.relationship || null,
      agencyName: body.occupant.agencyName || null,
      designation: body.occupant.designation || null,
      contactNo: body.occupant.contactNo || null,
      email: body.occupant.email || null,
      staffId: occupantType === "ACC_STAFF" || occupantType === "RESIDENT_STAFF"
        ? new ObjectId(auth.user.userId)
        : null,
      createdAt: now,
    };

    const occupantInsert = await db.collection("rb_occupants").insertOne(occupantDoc);

    // Create booking record
    const bookingDoc = {
      bookingRef,
      bookedByStaffId: new ObjectId(auth.user.userId),
      bookedBySnapshot: {
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.role,
        departmentId: auth.user.departmentId || null,
        divisionId: auth.user.divisionId || null,
      },
      occupantId: occupantInsert.insertedId,
      occupantSnapshot: {
        fullName: occupantDoc.fullName,
        cid: occupantDoc.idNumber,
        occupantType,
        relationship: occupantDoc.relationship,
      },
      roomId: room._id,
      roomNumberSnapshot: room.roomNumber,
      bedIds: bedObjectIds,
      bookingScope: body.bookingScope || (beds.length === 1 ? "SINGLE_BED" : "WHOLE_ROOM"),
      checkIn,
      checkOut,
      nights,
      purpose: body.purpose || "",
      caseRefNo: body.caseRefNo || null,
      rateTier,
      rateApplied: ratePerBed,
      totalAmount,
      paymentStatus: "PENDING",
      paymentMode: body.paymentMode || "PAYROLL_DEDUCTION",
      waiverReasonCode: null,
      waiverNote: null,
      approvedByWaiverStaffId: null,
      approvalId: null,
      bookingStatus:
        occupantType === "STAKEHOLDER" ? "PENDING_APPROVAL" : "CONFIRMED",
      checkInAt: null,
      checkOutAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const bookingInsert = await db.collection("rb_bookings").insertOne(bookingDoc);

    // Lock beds (mark OCCUPIED) — or leave RESERVED for pending approval
    const newBedStatus = occupantType === "STAKEHOLDER" ? "RESERVED" : "OCCUPIED";
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

    // Create ledger entry (PENDING)
    await db.collection("rb_ledger").insertOne({
      bookingId: bookingInsert.insertedId,
      staffId: new ObjectId(auth.user.userId),
      amount: totalAmount,
      type: "BOOKING",
      status: "UNPAID",
      dueDate: checkOut,
      settledAt: null,
      settledByStaffId: null,
      createdAt: now,
    });

    // Create approval record if STAKEHOLDER
    if (occupantType === "STAKEHOLDER") {
      await db.collection("rb_approvals").insertOne({
        bookingId: bookingInsert.insertedId,
        requestedByStaffId: new ObjectId(auth.user.userId),
        apicStaffId: null,
        apicAgency: null,
        approvalRefNo: null,
        approvalDate: null,
        approvalLetterUrl: null,
        status: "PENDING",
        remarks: null,
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
        occupantType,
        rateTier,
        totalAmount,
      },
    });

    // Send confirmation email (fire & forget)
    (async () => {
      try {
        const bedsList = beds.map((b: any) => b.bedLabel).join(", ");
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#059669">✅ Booking Confirmed</h2>
            <p>Dear <b>${auth.user.name}</b>,</p>
            <p>Your room booking has been confirmed.</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Booking Ref</b></td><td style="padding:8px;border:1px solid #ddd">${bookingRef}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Room / Bed</b></td><td style="padding:8px;border:1px solid #ddd">${room.roomNumber} · Bed ${bedsList}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Occupant</b></td><td style="padding:8px;border:1px solid #ddd">${occupantDoc.fullName}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Check-in</b></td><td style="padding:8px;border:1px solid #ddd">${checkIn.toDateString()}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Check-out</b></td><td style="padding:8px;border:1px solid #ddd">${checkOut.toDateString()}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Nights</b></td><td style="padding:8px;border:1px solid #ddd">${nights}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Total</b></td><td style="padding:8px;border:1px solid #ddd"><b>Nu. ${totalAmount}</b></td></tr>
            </table>
            ${occupantType === "STAKEHOLDER" ? "<p style='color:#d97706'><b>Note:</b> This booking is pending APIC approval.</p>" : ""}
          </div>
        `;
        await sendMail({
          to: auth.user.email,
          subject: `[Room Booking] Confirmation ${bookingRef}`,
          html,
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
        nights,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /bookings error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}