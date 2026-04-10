import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
      return new NextResponse("This link has already been used", { status: 400 });
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return new NextResponse("Link has expired", { status: 400 });
    }

    // Ensure requestId matches token record
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
    // 7. Response UI
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