// src/app/api/room-booking/bookings/[ref]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ref } = await params;
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const booking = await db.collection("rb_bookings").findOne({ bookingRef: ref });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (
      !auth.user.isAdmin &&
      booking.bookedByStaffId.toString() !== auth.user.userId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
      const size = opts?.size || 11;
      page.drawText(text, {
        x: 50,
        y,
        size,
        font: opts?.bold ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 6;
    };

    drawLine("ANTI-CORRUPTION COMMISSION", { bold: true, size: 14 });
    drawLine("Phuntsholing Regional Office", { size: 11 });
    y -= 10;
    drawLine("ROOM BOOKING CONFIRMATION", { bold: true, size: 16 });
    y -= 10;

    drawLine(`Booking Reference: ${booking.bookingRef}`, { bold: true });
    y -= 10;

    drawLine("BOOKING OFFICER", { bold: true, size: 12 });
    drawLine(`Name:       ${booking.bookedBySnapshot?.name || "-"}`);
    drawLine(`Email:      ${booking.bookedBySnapshot?.email || "-"}`);
    drawLine(`Role:       ${booking.bookedBySnapshot?.role || "-"}`);
    y -= 10;

    drawLine("OCCUPANT", { bold: true, size: 12 });
    drawLine(`Name:            ${booking.occupantSnapshot?.fullName || "-"}`);
    drawLine(`CID/ID:          ${booking.occupantSnapshot?.cid || "-"}`);
    drawLine(`Type:            ${booking.occupantSnapshot?.occupantType || "-"}`);
    if (booking.occupantSnapshot?.relationship) {
      drawLine(`Relationship:    ${booking.occupantSnapshot.relationship}`);
    }
    y -= 10;

    drawLine("STAY DETAILS", { bold: true, size: 12 });
    drawLine(`Room:            ${booking.roomNumberSnapshot || "-"}`);
    drawLine(`Check-in:        ${new Date(booking.checkIn).toDateString()}`);
    drawLine(`Check-out:       ${new Date(booking.checkOut).toDateString()}`);
    drawLine(`Nights:          ${booking.nights}`);
    drawLine(`Purpose:         ${booking.purpose || "-"}`);
    if (booking.caseRefNo) drawLine(`Case Ref:        ${booking.caseRefNo}`);
    y -= 10;

    drawLine("PAYMENT", { bold: true, size: 12 });
    drawLine(`Rate Tier:       ${booking.rateTier}`);
    drawLine(`Rate per Bed:    Nu. ${booking.rateApplied}`);
    drawLine(`Total Amount:    Nu. ${booking.totalAmount}`, { bold: true });
    drawLine(`Payment Mode:    ${booking.paymentMode}`);
    drawLine(`Payment Status:  ${booking.paymentStatus}`);
    y -= 20;

    drawLine(`Status: ${booking.bookingStatus}`, { bold: true });
    y -= 10;
    drawLine(`Generated on: ${new Date().toLocaleString()}`);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-${ref.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("GET /bookings/[ref]/pdf error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}