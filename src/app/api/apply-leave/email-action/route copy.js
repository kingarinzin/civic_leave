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

    // ========== SEND EMAIL TO APPLICANT (rich, responsive template) ==========
    const applicantUser = await db.collection("users").findOne({ _id: new ObjectId(leave.userId) });
    if (applicantUser?.email) {
      // Fetch approver's name
      const approverUser = await db.collection("users").findOne({ _id: new ObjectId(tokenRecord.approverId) });
      const approverName = approverUser?.name || "Approver";

      const transporter = createTransporter();
      const statusText = newStatus === "approved" ? "Approved" : "Rejected";
      const color = newStatus === "approved" ? "#2e7d32" : "#c62828";
      const icon = newStatus === "approved" ? "✅" : "❌";

      // Format dates nicely
      const fromDate = new Date(leave.fromDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const toDate = new Date(leave.toDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Responsive, visually appealing HTML email template
      const mailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leave ${statusText}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f7fc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; margin:20px auto; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
            <!-- HEADER -->
            <tr>
              <td style="padding:30px 30px 10px 30px; text-align:center; border-bottom:4px solid ${color};">
                <h1 style="margin:0; font-size:24px; color:#1a2a3a; letter-spacing:-0.5px;">
                  Leave ${statusText}
                </h1>
              </td>
            </tr>
            <!-- BODY -->
            <tr>
              <td style="padding:30px;">
                <p style="font-size:16px; line-height:1.6; color:#333333; margin-top:0;">
                  Hi <strong>${applicantUser.name || "User"}</strong>,
                </p>
                <p style="font-size:16px; line-height:1.6; color:#333333;">
                  Your leave request has been <strong style="color:${color};">${statusText}</strong> 
                  by <strong>${approverName}</strong>.
                </p>
                <!-- Status badge -->
                <div style="background-color:#f8f9fa; border-left:4px solid ${color}; padding:12px 16px; margin:20px 0; border-radius:4px;">
                  <p style="margin:0; font-size:15px; color:#555;">
                    <span style="font-size:20px;">${icon}</span> 
                    <strong>Status:</strong> <span style="color:${color};">${statusText.toUpperCase()}</span>
                  </p>
                </div>
                <!-- Leave details -->
                <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:15px;">
                  <tr>
                    <td style="padding:8px 12px; background:#f1f4f9; width:40%; font-weight:600; color:#1a2a3a;">Leave Type</td>
                    <td style="padding:8px 12px; background:#ffffff;">${leave.leaveTypeName || "—"}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px; background:#f1f4f9; font-weight:600; color:#1a2a3a;">From</td>
                    <td style="padding:8px 12px; background:#ffffff;">${fromDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px; background:#f1f4f9; font-weight:600; color:#1a2a3a;">To</td>
                    <td style="padding:8px 12px; background:#ffffff;">${toDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px; background:#f1f4f9; font-weight:600; color:#1a2a3a;">Total Days</td>
                    <td style="padding:8px 12px; background:#ffffff;">${leave.days} day${leave.days !== 1 ? 's' : ''}</td>
                  </tr>
                </table>
                <!-- Note -->
                <p style="font-size:14px; color:#666; line-height:1.5; margin-top:20px;">
                  This is an automated notification. If you have any questions, please contact HR.
                </p>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td style="padding:20px 30px; background-color:#f8fafc; border-top:1px solid #e9edf2; text-align:center; border-radius:0 0 8px 8px;">
                <p style="margin:0; font-size:13px; color:#8898aa;">
                  &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
                </p>
                <p style="margin:5px 0 0 0; font-size:12px; color:#a0b0c0;">
                  This message was sent automatically. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: applicantUser.email,
        subject: `Leave ${statusText}`,
        html: mailHtml,
      });
    }

    // Return success HTML page to the approver
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