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

    // Skip if already processed
    if (leave.status !== "pending") {
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

    // 4. Process approval/rejection
    const normalizedAction = action.toLowerCase();
    let newStatus;
    if (normalizedAction === "approve") {
      newStatus = "approved";
    } else if (normalizedAction === "reject") {
      newStatus = "rejected";
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // ========== DEDUCT BALANCE (skipBalance-aware) ==========
    if (newStatus === "approved") {
      const leaveType = await db.collection("leave-types").findOne({
        _id: new ObjectId(leave.leaveTypeId),
      });
      const shouldDeductBalance = leaveType?.skipBalance !== true;

      if (shouldDeductBalance) {
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

    // ========== SEND EMAIL TO APPLICANT (rich template, with approver name) ==========
    const applicantUser = await db.collection("users").findOne({ _id: new ObjectId(leave.userId) });
    if (applicantUser?.email) {
      // Fetch the approver's name from the token (the person who clicked the link)
      const approverUser = await db.collection("users").findOne({ _id: new ObjectId(tokenRecord.approverId) });
      const approverName = approverUser?.name || "Approver";

      const transporter = createTransporter();
      const statusText = newStatus === "approved" ? "Approved" : "Rejected";
      const color = newStatus === "approved" ? "#28a745" : "#dc3545";
      const mailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color:${color};">Leave ${statusText}</h2>
          <p>Hi ${applicantUser.name || "User"},</p>
          <p>Your leave request has been <strong>${statusText}</strong> by ${approverName}.</p>
          <p><strong>Leave Details:</strong></p>
          <ul>
            <li>Leave Type: ${leave.leaveTypeName || "—"}</li>
            <li>From: ${leave.fromDate}</li>
            <li>To: ${leave.toDate}</li>
            <li>Days: ${leave.days}</li>
          </ul>
          <p style="color: #666; font-size: 0.9em;">This is an automated notification.</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: applicantUser.email,
        subject: `Leave ${statusText}`,
        html: mailHtml,
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