import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { createTransporter } from "@/lib/mailer";

function getTokenUserId(req: NextRequest): string {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  return decoded.id;
}

function normalizeId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown };
    if (obj._id instanceof ObjectId) return obj._id.toString();
    if (typeof obj.toString === "function") {
      const str = obj.toString();
      if (str && str !== "[object Object]") return str;
    }
  }
  return "";
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUserId = getTokenUserId(req);
    const url = new URL(req.url);
    const applicationId = url.searchParams.get("applicationId");
    const remarks = url.searchParams.get("remarks") || "Deleted by admin";

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(currentUserId),
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const leaveApplication = await db.collection("leave_applications").findOne({
      _id: new ObjectId(applicationId),
    });
    if (!leaveApplication) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 });
    }

    // Authorization: only admin or assigned approver
    const approverRoles = ["DivisionHead", "DepartmentHead", "Commissioner"];
    const canApproveByRole = !!currentUser.isAdmin || approverRoles.includes(currentUser.role);
    const isAssignedApprover = normalizeId(leaveApplication.approverId) === currentUserId;
    if (!canApproveByRole) {
      return NextResponse.json({ error: "Not authorized (role)" }, { status: 403 });
    }
    if (!currentUser.isAdmin && !isAssignedApprover) {
      return NextResponse.json({ error: "Not assigned approver" }, { status: 403 });
    }

    // Prevent deleting already deleted records
    if (leaveApplication.status === "deleted") {
      return NextResponse.json({ error: "This leave is already deleted" }, { status: 400 });
    }

    // Update status to "deleted" – NO balance adjustment
    await db.collection("leave_applications").updateOne(
      { _id: new ObjectId(applicationId) },
      {
        $set: {
          status: "deleted",
          deletedBy: currentUser.name || currentUser.email || "Admin",
          deletedAt: new Date(),
          deletionRemarks: remarks,
          updatedAt: new Date(),
        },
      }
    );

    // Send email notification (optional)
    const applicantUser = await db.collection("users").findOne({
      _id: new ObjectId(leaveApplication.userId),
    });
    if (applicantUser?.email) {
      try {
        const transporter = createTransporter();
        const mailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color:#6c757d;">Leave Deleted</h2>
            <p>Hi ${applicantUser.name || "User"},</p>
            <p>Your leave request has been <strong>deleted</strong> by ${currentUser.name || "Admin"}.</p>
            <p><strong>Leave Details:</strong></p>
            <ul>
              <li>Leave Type: ${leaveApplication.leaveTypeName || "—"}</li>
              <li>From: ${leaveApplication.fromDate}</li>
              <li>To: ${leaveApplication.toDate}</li>
              <li>Days: ${leaveApplication.days}</li>
            </ul>
            ${remarks ? `<p><strong>Reason:</strong> ${remarks}</p>` : ""}
            <p><em>Note: Leave balance adjustments must be done manually by HR.</em></p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: applicantUser.email,
          subject: "Leave Deleted",
          html: mailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send deletion email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Leave deleted successfully (balance not adjusted automatically)",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/leave/leave-delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}