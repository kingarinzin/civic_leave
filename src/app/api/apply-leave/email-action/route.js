import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createTransporter } from "@/lib/mailer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const action = searchParams.get("action");
    const token = searchParams.get("token");

    if (!requestId || !action || !token) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 1. Validate token
    const tokenRecord = await db.collection("leave_action_tokens").findOne({ token });
    if (!tokenRecord) {
      return new NextResponse("Invalid or expired link", { status: 400 });
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return new NextResponse("Link has expired", { status: 400 });
    }

    if (tokenRecord.requestId.toString() !== requestId) {
      return new NextResponse("Invalid request reference", { status: 400 });
    }

    // 2. Fetch leave request
    const leave = await db.collection("leave_applications").findOne({ _id: new ObjectId(requestId) });
    if (!leave) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    // 3. Validate approver
    if (leave.approverId !== tokenRecord.approverId) {
      return new NextResponse("Unauthorized approver", { status: 403 });
    }

    // ========== CRITICAL: Skip if already processed ==========
    if (leave.status !== "pending") {
      // Mark token as used if not already
      if (!tokenRecord.used) {
        await db.collection("leave_action_tokens").updateOne(
          { _id: tokenRecord._id },
          { $set: { used: true, usedAt: new Date() } }
        );
      }
      const message = `
        <html>
          <head><title>Already Processed</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>This leave request has already been processed</h2>
            <p>Current status: <strong>${leave.status.toUpperCase()}</strong></p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p>No further action is needed.</p>
          </body>
        </html>
      `;
      return new NextResponse(message, { headers: { "Content-Type": "text/html" } });
    }

    // 4. Process approval/rejection (only if pending)
    const normalizedAction = action.toLowerCase();
    let newStatus;
    if (normalizedAction === "approve") {
      newStatus = "approved";
    } else if (normalizedAction === "reject") {
      newStatus = "rejected";
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // Deduct balance only on approval
    if (newStatus === "approved") {
      const leaveYear = new Date(leave.fromDate).getFullYear();
      const applicantObjectId = new ObjectId(leave.userId);
      const leaveTypeIdObj = new ObjectId(leave.leaveTypeId);
      const daysToDeduct = Number(leave.days);

      const balanceDoc = await db.collection("leave_balances").findOne({
        userId: applicantObjectId,
        year: leaveYear,
      });

      if (!balanceDoc) {
        return new NextResponse("Leave balance record not found", { status: 404 });
      }

      const leaveIndex = balanceDoc.leaves.findIndex(
        (l) => l.leaveTypeId.toString() === leaveTypeIdObj.toString()
      );

      if (leaveIndex === -1) {
        return new NextResponse("Leave type not found in balance record", { status: 404 });
      }

      const currentUsed = Number(balanceDoc.leaves[leaveIndex].used) || 0;
      const allocated = Number(balanceDoc.leaves[leaveIndex].allocated);
      const remainingBalance = allocated - currentUsed;

      if (daysToDeduct > remainingBalance) {
        return new NextResponse("Insufficient leave balance", { status: 400 });
      }

      const newUsed = currentUsed + daysToDeduct;
      const newBalance = allocated - newUsed;

      await db.collection("leave_balances").updateOne(
        { _id: balanceDoc._id },
        {
          $set: {
            [`leaves.${leaveIndex}.used`]: newUsed,
            [`leaves.${leaveIndex}.balance`]: newBalance,
            updatedAt: new Date(),
          },
        }
      );
    }

    // Update leave status
    await db.collection("leave_applications").updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    // Mark token as used
    await db.collection("leave_action_tokens").updateOne(
      { _id: tokenRecord._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Send email to applicant (optional)
    const applicantUser = await db.collection("users").findOne({ _id: new ObjectId(leave.userId) });
    if (applicantUser?.email) {
      const transporter = createTransporter();
      const applicantMailHtml =
        newStatus === "approved"
          ? `<div><h2 style="color:#28a745;">Leave Approved</h2><p>Hi ${applicantUser.name}, your leave has been approved.</p><p>From: ${leave.fromDate}<br>To: ${leave.toDate}</p></div>`
          : `<div><h2 style="color:#dc3545;">Leave Rejected</h2><p>Hi ${applicantUser.name}, your leave has been rejected.</p><p>From: ${leave.fromDate}<br>To: ${leave.toDate}</p></div>`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: applicantUser.email,
        subject: `Leave ${newStatus}`,
        html: applicantMailHtml,
      });
    }

    const message = newStatus === "approved" ? "Leave Approved Successfully" : "Leave Rejected Successfully";
    return new NextResponse(
      `<html><body style="font-family:Arial;text-align:center;padding:50px;"><h2>${message}</h2><p>Request ID: ${requestId}</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Email action error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}