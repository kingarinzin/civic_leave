// src/app/api/room-booking/reports/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

/**
 * GET /api/room-booking/reports/export?type=bookings|ledger
 * CSV export.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "bookings";

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const escapeCsv = (v: any): string => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };

    const rows: string[] = [];
    let filename = "export.csv";

    if (type === "bookings") {
      const bookings = await db
        .collection("rb_bookings")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      rows.push(
        [
          "Booking Ref",
          "Officer",
          "Room",
          "Beds",
          "Occupant",
          "Occupant Type",
          "Check-in",
          "Check-out",
          "Nights",
          "Tier",
          "Rate/Bed",
          "Total",
          "Payment Status",
          "Booking Status",
          "Created At",
        ].join(","),
      );

      for (const b of bookings) {
        rows.push(
          [
            escapeCsv(b.bookingRef),
            escapeCsv(b.bookedBySnapshot?.name),
            escapeCsv(b.roomNumberSnapshot),
            escapeCsv((b.bedIds || []).length),
            escapeCsv(b.occupantSnapshot?.fullName),
            escapeCsv(b.occupantSnapshot?.occupantType),
            escapeCsv(new Date(b.checkIn).toISOString().slice(0, 10)),
            escapeCsv(new Date(b.checkOut).toISOString().slice(0, 10)),
            escapeCsv(b.nights),
            escapeCsv(b.rateTier),
            escapeCsv(b.rateApplied),
            escapeCsv(b.totalAmount),
            escapeCsv(b.paymentStatus),
            escapeCsv(b.bookingStatus),
            escapeCsv(new Date(b.createdAt).toISOString()),
          ].join(","),
        );
      }

      filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "ledger") {
      const ledger = await db
        .collection("rb_ledger")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      const staffIds = ledger.map((l) => l.staffId).filter(Boolean);
      const staff = await db
        .collection("users")
        .find({ _id: { $in: staffIds } })
        .toArray();
      const staffMap = Object.fromEntries(
        staff.map((s) => [s._id.toString(), s.name]),
      );

      rows.push(
        ["ID", "Staff", "Amount", "Type", "Status", "Due Date", "Created At", "Settled At"].join(","),
      );

      for (const l of ledger) {
        rows.push(
          [
            escapeCsv(l._id.toString()),
            escapeCsv(staffMap[l.staffId?.toString()] || l.staffId?.toString()),
            escapeCsv(l.amount),
            escapeCsv(l.type),
            escapeCsv(l.status),
            escapeCsv(l.dueDate ? new Date(l.dueDate).toISOString().slice(0, 10) : ""),
            escapeCsv(new Date(l.createdAt).toISOString()),
            escapeCsv(l.settledAt ? new Date(l.settledAt).toISOString() : ""),
          ].join(","),
        );
      }

      filename = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /reports/export error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}