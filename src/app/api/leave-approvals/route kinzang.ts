import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { isLeaveApproverRole } from "@/lib/leave-approval";

type LeaveBalanceLeaf = {
  leaveTypeId: unknown;
  used?: number;
  balance?: number;
  [key: string]: unknown;
};

const getYear = () => new Date().getFullYear();

function getTokenUserId(req: Request): string {
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
  if (typeof value === "object" && value !== null) {
    const maybeObject = value as { _id?: unknown; toString?: () => string };
    if (maybeObject._id) return normalizeId(maybeObject._id);
    if (typeof maybeObject.toString === "function") return maybeObject.toString();
  }
  return "";
}

export async function GET(req: Request) {
  try {
    const currentUserId = getTokenUserId(req);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(currentUserId),
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canApprove = !!currentUser.isAdmin || isLeaveApproverRole(currentUser.role);
    if (!canApprove) {
      return NextResponse.json({ applications: [] }, { status: 200 });
    }

    const query: Record<string, unknown> = { status: "pending" };
    if (!currentUser.isAdmin) {
      query.approverId = currentUserId;
    }

    const applications = await db
      .collection("leave_applications")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();

    const mapped = applications.map((entry) => {
      const department = departments.find(
        (d) => normalizeId(d._id) === normalizeId(entry.departmentId)
      );
      const division = divisions.find(
        (d) => normalizeId(d._id) === normalizeId(entry.divisionId)
      );

      return {
        _id: normalizeId(entry._id),
        userId: entry.userId,
        userName: entry.userName || "-",
        applicantRole: entry.applicantRole || "Officer",
        departmentName: department?.name || "-",
        divisionName: division?.name || "-",
        leaveTypeName: entry.leaveTypeName || "-",
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        days: Number(entry.days || 0),
        description: entry.description || "",
        approverName: entry.approverName || "-",
        approverRole: entry.approverRole || "-",
        createdAt: entry.createdAt,
        status: entry.status || "pending",
      };
    });

    return NextResponse.json({ applications: mapped });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("GET /api/leave-approvals error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUserId = getTokenUserId(req);

    const { applicationId, action, remarks } = await req.json();
    if (!applicationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
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

    if (leaveApplication.status !== "pending") {
      return NextResponse.json(
        { error: "This leave request has already been processed" },
        { status: 400 }
      );
    }

    const canApproveByRole = !!currentUser.isAdmin || isLeaveApproverRole(currentUser.role);
    const isAssignedApprover = normalizeId(leaveApplication.approverId) === currentUserId;

    if (!canApproveByRole || (!currentUser.isAdmin && !isAssignedApprover)) {
      return NextResponse.json({ error: "Not authorized for this leave request" }, { status: 403 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    await db.collection("leave_applications").updateOne(
      { _id: new ObjectId(applicationId) },
      {
        $set: {
          status: newStatus,
          reviewRemarks: remarks || "",
          reviewedAt: new Date(),
          reviewedById: currentUserId,
          reviewedByRole: currentUser.role || (currentUser.isAdmin ? "Admin" : "Approver"),
          reviewedByName:
            currentUser.name || currentUser.name || currentUser.email || "Approver",
          updatedAt: new Date(),
        },
      }
    );

    // Balance is reserved at apply time. Revert it only when rejected.
    if (newStatus === "rejected") {
      const year = getYear();
      const applicantObjectId = new ObjectId(leaveApplication.userId);
      const leaveBalance = await db.collection("leave_balances").findOne({
        userId: applicantObjectId,
        year,
      });

      if (leaveBalance && Array.isArray(leaveBalance.leaves)) {
        const updatedLeaves = leaveBalance.leaves.map((leaf: LeaveBalanceLeaf) => {
          if (normalizeId(leaf.leaveTypeId) !== normalizeId(leaveApplication.leaveTypeId)) {
            return leaf;
          }

          const days = Number(leaveApplication.days || 0);
          const updatedUsed = Math.max(0, Number(leaf.used || 0) - days);
          const updatedBalance = Number(leaf.balance || 0) + days;

          return {
            ...leaf,
            used: updatedUsed,
            balance: updatedBalance,
          };
        });

        await db.collection("leave_balances").updateOne(
          { _id: leaveBalance._id },
          { $set: { leaves: updatedLeaves, updatedAt: new Date() } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${newStatus}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("POST /api/leave-approvals error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
