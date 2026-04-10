import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { normalizeRole, resolveApproverForApplicant } from "@/lib/leave-approval";
import crypto from "crypto";  //email
import { createTransporter } from "@/lib/mailer";

const getYear = () => new Date().getFullYear();

function normalizeId(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object" && value !== null) {
    if (value._id && value._id !== value) {
      return normalizeId(value._id);
    }

    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }

    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str !== "[object Object]") return str;
    }
  }

  return "";
}

function toObjectIdSafe(value) {
  try {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
  } catch {
    return null;
  }
}

function getUserIdFromAuth(req) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded?.id) throw new Error("Unauthorized");

  return decoded.id;
}

function calculateLeaveDays(fromDate, toDate, isHalfDay) {
  if (isHalfDay) return 0.5;

  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return -1;
  if (end < start) return -1;

  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function isDateBeforeToday(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return inputDate < today;
}

export async function GET(req) {
  try {
    const userId = getUserIdFromAuth(req);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const requester = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!requester) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const requesterRole = normalizeRole(requester.role);
    const requesterDepartmentId = normalizeId(requester.departmentId);
    const requesterDivisionId = normalizeId(requester.divisionId);

    let userScopeIds = [userId];
    let visibilityLabel = "My Leaves";

    if (["DivisionHead", "DepartmentHead"].includes(requesterRole)) {
      visibilityLabel = "My Department Leaves";

      if (requesterDepartmentId) {
        const departmentMembers = await db.collection("users").find({
          departmentId: { $in: [requesterDepartmentId] },
        }).toArray();

        userScopeIds = departmentMembers.map((u) => normalizeId(u._id)).filter(Boolean);
      }
    } else if (requesterDivisionId) {
      visibilityLabel = "My Division Leaves";

      const divisionMembers = await db.collection("users").find({
        divisionId: { $in: [requesterDivisionId] },
      }).toArray();

      userScopeIds = divisionMembers.map((u) => normalizeId(u._id)).filter(Boolean);
    }

    const leaveApplications = await db
      .collection("leave_applications")
      .find({ userId: { $in: userScopeIds } })
      .sort({ createdAt: -1 })
      .toArray();

    const usersInScope = await db.collection("users").find({
      _id: {
        $in: userScopeIds
          .filter((id) => ObjectId.isValid(id))
          .map((id) => new ObjectId(id)),
      },
    }).toArray();

    const userNameMap = new Map(
      usersInScope.map((u) => [
        normalizeId(u._id),
        u.name || u.email || "-",
      ])
    );

    const leaveTypes = await db.collection("leave-types").find({}).toArray();

    const leaveTypeMap = new Map(
      leaveTypes.map((lt) => [lt._id.toString(), lt.name])
    );

    const mapped = leaveApplications.map((entry) => ({
      ...entry,
      _id: entry._id.toString(),
      userName:
        entry.userName ||
        userNameMap.get(normalizeId(entry.userId)) ||
        "-",
      leaveTypeName:
        entry.leaveTypeName ||
        leaveTypeMap.get(entry.leaveTypeId?.toString()) ||
        "-",
    }));

    return NextResponse.json({ applications: mapped, visibilityLabel });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("GET /api/apply-leave error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const userId = getUserIdFromAuth(req);

    const {
      isHalfDay,
      leaveTypeId,
      fromDate,
      toDate,
      days,
      description,
      attachmentName,
    } = await req.json();

    if (!leaveTypeId || !fromDate || !toDate || !days) {
      return NextResponse.json(
        { error: "Leave type, dates, and no. of days are required" },
        { status: 400 }
      );
    }

    if (isDateBeforeToday(fromDate) || isDateBeforeToday(toDate)) {
      return NextResponse.json(
        { error: "Past dates are not allowed" },
        { status: 400 }
      );
    }

    const parsedDays = Number(days);
    const calculatedDays = calculateLeaveDays(fromDate, toDate, !!isHalfDay);

    if (calculatedDays <= 0) {
      return NextResponse.json({ error: "Invalid leave date range" }, { status: 400 });
    }

    if (parsedDays <= 0 || parsedDays > calculatedDays) {
      return NextResponse.json(
        { error: "Invalid number of days" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const userObjectId = toObjectIdSafe(userId);
    if (!userObjectId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const year = getYear();

    const applicantUser = await db.collection("users").findOne({
      _id: userObjectId,
    });

    if (!applicantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let resolvedApprover;

    try {
      // 🔵 LOG BEFORE CALL
      console.log("🔵 BEFORE calling resolveApproverForApplicant", {
        userId,
        role: applicantUser.role,
        departmentId: applicantUser.departmentId,
        divisionId: applicantUser.divisionId,
      });

      resolvedApprover = await resolveApproverForApplicant(db, applicantUser, {
        fromDate,
        toDate,
      });

      // 🟢 LOG AFTER CALL
      console.log("🟢 AFTER resolveApproverForApplicant", resolvedApprover);

    } catch (err) {
      console.error("Approver resolution failed:", err);
      return NextResponse.json(
        { error: "Approver resolution failed" },
        { status: 500 }
      );
    }

    if (!resolvedApprover?.approverId) {
      return NextResponse.json(
        { error: "No approver configured" },
        { status: 400 }
      );
    }

    const leaveBalance = await db.collection("leave_balances").findOne({
      userId: userObjectId,
      year,
    });

    if (!leaveBalance) {
      return NextResponse.json({ error: "Leave balance not found" }, { status: 404 });
    }

    const leaveType = leaveBalance.leaves?.find(
      (entry) => entry.leaveTypeId?.toString() === leaveTypeId
    );

    if (!leaveType) {
      return NextResponse.json({ error: "Leave type not assigned" }, { status: 400 });
    }

    if (parsedDays > Number(leaveType.balance || 0)) {
      return NextResponse.json(
        { error: "Insufficient leave balance" },
        { status: 400 }
      );
    }

    const result = await db.collection("leave_applications").insertOne({
      userId: userObjectId,
      userName: applicantUser.name || applicantUser.email || "",
      applicantRole: applicantUser.role || "Officer",
      departmentId: applicantUser.departmentId || "",
      divisionId: applicantUser.divisionId || "",
      leaveTypeId,
      leaveTypeName: leaveType.leaveTypeName || "",
      fromDate,
      toDate,
      days: parsedDays,
      isHalfDay: !!isHalfDay,
      approvingAuthority: resolvedApprover.approverName,
      approverId: resolvedApprover.approverId,
      approverRole: resolvedApprover.approverRole,
      approverName: resolvedApprover.approverName,
      description: description || "",
      attachmentName: attachmentName || "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

//=================================Token Generation====================================
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);
  
  //=================================Save Token in the DB ==================================
    await db.collection("leave_action_tokens").insertOne({
      token,
      requestId: result.insertedId,
      approverId: resolvedApprover.approverId,
      used: false,
      expiresAt: tokenExpiry,
      createdAt: new Date(),
    });

//=================================Approve and Reject Link==================================
    const baseUrl = process.env.APP_URL;
    const approveLink = `${baseUrl}/api/apply-leave/email-action?requestId=${result.insertedId}&token=${token}&action=approve`;
    const rejectLink = `${baseUrl}/api/apply-leave/email-action?requestId=${result.insertedId}&token=${token}&action=reject`;

//=================================Build in Email Template===================================
    const mailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        
        <h2 style="color: #333;">Leave Approval Request</h2>

        <p><strong>Applicant:</strong> ${applicantUser.name || applicantUser.email}</p>
        <p><strong>Leave Type:</strong> ${leaveType.leaveTypeName}</p>
        <p><strong>From:</strong> ${fromDate}</p>
        <p><strong>To:</strong> ${toDate}</p>
        <p><strong>Days:</strong> ${parsedDays}</p>
        <p><strong>Description:</strong> ${description || "-"}</p>

        <hr style="margin: 20px 0;" />

        <p>Please review and take action:</p>

        <div style="margin-top: 20px;">
          
          <a href="${approveLink}" 
            style="background-color: #28a745; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
            Approve
          </a>

          <a href="${rejectLink}" 
            style="background-color: #dc3545; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">
            Reject
          </a>

        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          This is an automated email. Please do not reply.
        </p>

      </div>
    `;  

//=================================Email Transporter ===================================
// Fetch approver
const approverUser = await db.collection("users").findOne({
  _id: new ObjectId(resolvedApprover.approverId),
});

// ✅ create transporter ONLY ONCE
const transporter = createTransporter();

// ================= Approver Email =================
if (!approverUser?.email) {
  console.error("Approver email not found");
} else {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: approverUser.email,
      subject: `Leave Approval Request - ${applicantUser.name || applicantUser.email}`,
      html: mailHtml,
    });
  } catch (emailErr) {
    console.error("Approver email sending failed:", emailErr);
  }
}

// ================= Applicant Email =================
if (applicantUser?.email) {
  console.log("Applicant email:", applicantUser?.email);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: applicantUser.email,
      subject: "Leave Request Submitted Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Leave Request Submitted</h2>

          <p>Hi ${applicantUser.name || "User"},</p>

          <p>Your leave request has been successfully submitted and is currently <strong>pending approval</strong>.</p>

          <p><strong>Leave Details:</strong></p>
          <ul>
            <li>Leave Type: ${leaveType.leaveTypeName}</li>
            <li>From: ${fromDate}</li>
            <li>To: ${toDate}</li>
            <li>Days: ${parsedDays}</li>
          </ul>

          <p>You will be notified once your request is approved or rejected.</p>

          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Applicant email failed:", err);
  }
}

    return NextResponse.json({ message: "Leave applied successfully" }, { status: 201 });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("POST /api/apply-leave error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}