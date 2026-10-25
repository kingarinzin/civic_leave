import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createTransporter } from "@/lib/mailer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");
    const action = searchParams.get("action");
    const token = searchParams.get("token");

    if (!bookingId || !action || !token) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Validate Token
    const tokenRecord = await db.collection("rb_action_tokens").findOne({ token });
    if (!tokenRecord) return new NextResponse("Invalid or expired link", { status: 400 });
    if (new Date(tokenRecord.expiresAt) < new Date()) return new NextResponse("Link has expired", { status: 400 });
    if (tokenRecord.bookingId.toString() !== bookingId) return new NextResponse("Invalid reference", { status: 400 });

    // 2. Fetch Booking
    const booking = await db.collection("rb_bookings").findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return new NextResponse("Booking not found", { status: 404 });

    if (booking.bookingStatus !== "PENDING_APPROVAL") {
      return new NextResponse(`This booking has already been ${booking.bookingStatus.toLowerCase()}.`, { status: 400 });
    }

    // 3. Process Action
    const newStatus = action === "approve" ? "CONFIRMED" : "CANCELLED";
    const statusText = action === "approve" ? "APPROVED" : "REJECTED";
    const statusColor = action === "approve" ? "#2e7d32" : "#c62828";

    await db.collection("rb_bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { bookingStatus: newStatus, updatedAt: new Date() } }
    );

    await db.collection("rb_approvals").updateOne(
      { bookingId: new ObjectId(bookingId) },
      { $set: { status: statusText, updatedAt: new Date() } }
    );

    await db.collection("rb_action_tokens").updateOne(
      { _id: tokenRecord._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // If Approved, change bed status from RESERVED to OCCUPIED
    if (action === "approve") {
      await db.collection("rb_beds").updateMany(
        { currentBookingId: new ObjectId(bookingId) },
        { $set: { status: "OCCUPIED" } }
      );
    } else {
      // If Rejected, free the beds
      await db.collection("rb_beds").updateMany(
        { currentBookingId: new ObjectId(bookingId) },
        { $set: { status: "AVAILABLE", currentBookingId: null } }
      );
    }

    // 4. Send Final Notification to Regional Heads, Room Admin, and User
    const transporter = createTransporter();
    
    const divHead = await db.collection("users").findOne({ role: "DivisionHead" });
    const deptHead = await db.collection("users").findOne({ role: "DepartmentHead" });
    const roomAdmin = await db.collection("users").findOne({ isRoomBookingAdmin: true });
    
    const ccEmails = [
      booking.bookedBySnapshot.email, 
      divHead?.email, 
      deptHead?.email, 
      roomAdmin?.email
    ].filter(Boolean);

    const notifyHtml = `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color:${statusColor};">Room Booking ${statusText}</h2>
        <p>The room booking <strong>${booking.bookingRef}</strong> has been <strong>${statusText}</strong> via email.</p>
        
        <div style="background:#F3F4F6; padding:15px; border-radius:8px; margin:20px 0;">
          <p><strong>Room:</strong> ${booking.roomNumberSnapshot}</p>
          <p><strong>Requested By:</strong> ${booking.bookedBySnapshot.name}</p>
          <p><strong>Total Amount:</strong> Nu. ${booking.totalAmount}</p>
        </div>
        
        <p style="font-size: 12px; color: #666;">This is an automated notification.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: ccEmails,
      subject: `[Room Booking] ${statusText} - ${booking.bookingRef}`,
      html: notifyHtml,
    });

    // 5. Return success HTML to the Commissioner
    return new NextResponse(
      `<html><body style="font-family:Arial;text-align:center;padding:50px;">
        <h2 style="color:${statusColor};">Booking ${statusText} Successfully</h2>
        <p>Booking Ref: ${booking.bookingRef}</p>
        <p>You can close this window.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

  } catch (error) {
    console.error("Email action error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}