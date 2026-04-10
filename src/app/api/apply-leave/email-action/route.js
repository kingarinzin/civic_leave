import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createTransporter } from "@/lib/mailer"; // ✅ FIXED IMPORT

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const requestId = searchParams.get("requestId");
    const action = searchParams.get("action"); // approve | reject
    const token = searchParams.get("token");

    if (!requestId || !action || !token) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // ================================
    // 1. Validate token
    // ================================
    const tokenRecord = await db.collection("leave_action_tokens").findOne({
      token,
    });

    if (!tokenRecord) {
      return new NextResponse("Invalid or expired link", { status: 400 });
    }

    if (tokenRecord.used) {
      const leave = await db.collection("leave_applications").findOne({
        _id: new ObjectId(requestId),
      });

      return new NextResponse(
        `
        <html>
          <head>
            <title>Already Processed</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>This request has already been processed</h2>
            <p>Status: <strong>${leave?.status?.toUpperCase()}</strong></p>
            <p><strong>Request ID:</strong> ${requestId}</p>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return new NextResponse("Link has expired", { status: 400 });
    }

    if (tokenRecord.requestId.toString() !== requestId) {
      return new NextResponse("Invalid request reference", { status: 400 });
    }

    // ================================
    // 2. Fetch leave request
    // ================================
    const leave = await db.collection("leave_applications").findOne({
      _id: new ObjectId(requestId),
    });

    if (!leave) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    // ================================
    // 3. Validate approver
    // ================================
    if (leave.approverId !== tokenRecord.approverId) {
      return new NextResponse("Unauthorized approver", { status: 403 });
    }

    // ================================
    // 4. Determine action
    // ================================
    const normalizedAction = action.toLowerCase();

    let newStatus;
    if (normalizedAction === "approve") {
      newStatus = "approved";
    } else if (normalizedAction === "reject") {
      newStatus = "rejected";
    } else {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // ================================
    // 5. Update leave status
    // ================================
    await db.collection("leave_applications").updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    // ================================
    // 6. Mark token as used
    // ================================
    await db.collection("leave_action_tokens").updateOne(
      { _id: tokenRecord._id },
      {
        $set: {
          used: true,
          usedAt: new Date(),
        },
      }
    );

    // ================================
    // 7. Fetch applicant
    // ================================
    const applicantUser = await db.collection("users").findOne({
      _id: new ObjectId(leave.userId),
    });

    // ================================
    // 8. Build email HTML
    // ================================
    let applicantMailHtml = "";

    if (newStatus === "approved") {
      applicantMailHtml = `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color: #28a745;">Leave Approved</h2>
          <p>Hi ${applicantUser?.name || "User"},</p>
          <p>Your leave request has been <strong>approved</strong>.</p>
          <p><strong>From:</strong> ${leave.fromDate}</p>
          <p><strong>To:</strong> ${leave.toDate}</p>
        </div>
      `;
    } else {
      applicantMailHtml = `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color: #dc3545;">Leave Rejected</h2>
          <p>Hi ${applicantUser?.name || "User"},</p>
          <p>Your leave request has been <strong>rejected</strong>.</p>
          <p><strong>From:</strong> ${leave.fromDate}</p>
          <p><strong>To:</strong> ${leave.toDate}</p>
        </div>
      `;
    }

    // ================================
    // 9. Send email to applicant
    // ================================
    if (applicantUser?.email) {
      const transporter = createTransporter(); // ✅ FIXED HERE

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: applicantUser.email,
        subject: `Leave ${newStatus}`,
        html: applicantMailHtml,
      });
    }

    // ================================
    // 10. Response UI
    // ================================
    const message =
      normalizedAction === "approve"
        ? "Leave Approved Successfully"
        : "Leave Rejected Successfully";

    return new NextResponse(
      `
      <html>
        <head>
          <title>Leave Action</title>
        </head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>${message}</h2>
          <p><strong>Request ID:</strong> ${requestId}</p>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html" },
      }
    );

  } catch (error) {
    console.error("Email action error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}