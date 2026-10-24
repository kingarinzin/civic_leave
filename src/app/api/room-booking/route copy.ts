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
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await canBook(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    // 1. Basic Validation
    if (!body.roomId || !ObjectId.isValid(body.roomId)) {
      return NextResponse.json({ error: "Valid roomId required" }, { status: 400 });
    }
    if (!Array.isArray(body.bedIds) || body.bedIds.length === 0) {
      return NextResponse.json({ error: "At least one bedId required" }, { status: 400 });
    }

    // 2. Validate Guests Array
    const guestsList = Array.isArray(body.guests) ? body.guests : [];
    if (guestsList.length === 0) {
      return NextResponse.json({ error: "At least one guest is required" }, { status: 400 });
    }

    // 3. Validate Individual Guest Dates
    for (const g of guestsList) {
      if (!g.checkIn || !g.checkOut) {
        return NextResponse.json({ error: `Dates missing for guest: ${g.fullName}` }, { status: 400 });
      }
      if (new Date(g.checkOut) <= new Date(g.checkIn)) {
        return NextResponse.json({ error: `Check-out must be after Check-in for guest: ${g.fullName}` }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 4. Get room and beds
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

    // 5. Verify beds belong to room and are available
    for (const bed of beds) {
      if (bed.roomId.toString() !== body.roomId) {
        return NextResponse.json({ error: "Bed does not belong to selected room" }, { status: 400 });
      }
      if (bed.status !== "AVAILABLE") {
        return NextResponse.json({ error: `Bed ${bed.bedLabel} is ${bed.status}` }, { status: 409 });
      }
    }

    // 6. Check date conflicts for ALL guests across the requested dates
    // Note: We check the global min/max dates against the beds to ensure the room is free
    const minDate = new Date(Math.min(...guestsList.map((g: any) => new Date(g.checkIn).getTime())));
    const maxDate = new Date(Math.max(...guestsList.map((g: any) => new Date(g.checkOut).getTime())));

    const conflicts = await db
      .collection("rb_bookings")
      .find({
        bookingStatus: { $in: ["CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN"] },
        bedIds: { $in: bedObjectIds },
        // Check for any overlap in the date range
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

    // 7. Rate Engine & Calculations
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
    let hasStakeholder = false;
    const processedGuests = [];

    for (const guest of guestsList) {
      const type = guest.occupantType || "ACC_STAFF";
      if (type === "STAKEHOLDER") hasStakeholder = true;
      
      const tierKey = TIER_MAP[type] || "tier2";
      const rateTier = TIER_LABEL[type] || "TIER2";

      // Find the bed rate for this guest's tier (using the highest rate if multiple beds)
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

    // 8. Generate booking reference
    const year = new Date().getFullYear();
    const count = await db.collection("rb_bookings").countDocuments({});
    const bookingRef = `ACC/PRO/BK/${year}/${String(count + 1).padStart(4, "0")}`;

    const now = new Date();

    // 9. Create occupant records for EVERY guest
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

    // 10. Create booking record
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
      // Map guest details directly to the booking for reference
      guests: processedGuests.map(g => ({
        fullName: g.fullName,
        occupantType: g.occupantType,
        checkIn: g.parsedCheckIn,
        checkOut: g.parsedCheckOut,
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
      bookingStatus: hasStakeholder ? "PENDING_APPROVAL" : "CONFIRMED",
      createdAt: now,
      updatedAt: now,
    };

    const bookingInsert = await db.collection("rb_bookings").insertOne(bookingDoc);

    // 11. Lock beds
    const newBedStatus = hasStakeholder ? "RESERVED" : "OCCUPIED";
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

    // 12. Create ledger entries (Create one ledger entry per guest)
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

    // 13. Create approval record if any guest is STAKEHOLDER
    if (hasStakeholder) {
      await db.collection("rb_approvals").insertOne({
        bookingId: bookingInsert.insertedId,
        requestedByStaffId: new ObjectId(auth.user.userId),
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

    // 14. Send confirmation email
    (async () => {
      try {
        const bedsList = beds.map((b: any) => b.bedLabel).join(", ");
        
        let guestRows = processedGuests.map(g => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd">${g.fullName}</td>
            <td style="padding:8px;border:1px solid #ddd">${g.parsedCheckIn.toDateString()} to ${g.parsedCheckOut.toDateString()}</td>
            <td style="padding:8px;border:1px solid #ddd">Nu. ${g.totalAmount}</td>
          </tr>
        `).join("");

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#059669">✅ Booking Confirmed</h2>
            <p>Dear <b>${auth.user.name}</b>,</p>
            <p>Your room booking has been confirmed.</p>
            <p><b>Booking Ref:</b> ${bookingRef}</p>
            <p><b>Room / Bed:</b> ${room.roomNumber} · Bed ${bedsList}</p>
            
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <thead style="background:#f9fafb">
                <tr>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Guest</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Dates</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left">Total</th>
                </tr>
              </thead>
              <tbody>
                ${guestRows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:8px;border:1px solid #ddd;text-align:right"><b>Grand Total:</b></td>
                  <td style="padding:8px;border:1px solid #ddd;background:#f9fafb"><b>Nu. ${totalAmount}</b></td>
                </tr>
              </tfoot>
            </table>
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
        guestsCount: processedGuests.length,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /bookings error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}