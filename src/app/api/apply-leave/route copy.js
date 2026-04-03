import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { normalizeRole, resolveApproverForApplicant } from "@/lib/leave-approval";

const getYear = () => new Date().getFullYear();

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    if (value._id) return normalizeId(value._id);
    if (typeof value.toString === "function") return value.toString();
  }
  return "";
}

function buildIdVariants(id) {
  const variants = [id];
  if (ObjectId.isValid(id)) {
    variants.push(new ObjectId(id));
  }
  return variants;
}

function getUserIdFromAuth(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
}

function calculateLeaveDays(fromDate, toDate, isHalfDay) {
  if (isHalfDay) return 0.5;

  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return -1;
  }

  if (end < start) {
    return -1;
  }

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

    const requester = await db.collection("users").findOne({ _id: new ObjectId(userId) });
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
          departmentId: { $in: buildIdVariants(requesterDepartmentId) },
        }).toArray();
        userScopeIds = departmentMembers.map((u) => normalizeId(u._id)).filter(Boolean);
      }
    } else if (requesterDivisionId) {
      visibilityLabel = "My Division Leaves";
      const divisionMembers = await db.collection("users").find({
        divisionId: { $in: buildIdVariants(requesterDivisionId) },
      }).toArray();
      userScopeIds = divisionMembers.map((u) => normalizeId(u._id)).filter(Boolean);
    }

    if (userScopeIds.length === 0) {
      userScopeIds = [userId];
    }

    const leaveApplications = await db
      .collection("leave_applications")
      .find({ userId: { $in: userScopeIds } })
      .sort({ createdAt: -1 })
      .toArray();

    const usersInScope = await db.collection("users").find({
      _id: { $in: userScopeIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) },
    }).toArray();

    const userNameMap = new Map(
      usersInScope.map((u) => [
        normalizeId(u._id),
        u.name || u.name || u.email || "-",
      ])
    );

    const leaveTypes = await db.collection("leave-types").find({}).toArray();
    const leaveTypeMap = new Map(
      leaveTypes.map((lt) => [lt._id.toString(), lt.name])
    );

    const mapped = leaveApplications.map((entry) => ({
      ...entry,
      _id: entry._id.toString(),
      userName: entry.userName || userNameMap.get(normalizeId(entry.userId)) || "-",
      leaveTypeName:
        entry.leaveTypeName || leaveTypeMap.get(entry.leaveTypeId?.toString()) || "-",
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
        { error: "Past dates are not allowed. Please select today or future dates" },
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
        { error: "No. of days must be valid and cannot exceed selected date range" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const year = getYear();
    const userObjectId = new ObjectId(userId);
    const applicantUser = await db.collection("users").findOne({ _id: userObjectId });

    if (!applicantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resolvedApprover = await resolveApproverForApplicant(db, applicantUser, {
      fromDate,
      toDate,
    });
    if (!resolvedApprover?.approverId) {
      return NextResponse.json(
        { error: "No approver configured for your department/division hierarchy" },
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
        { error: "No. of days cannot exceed available leave balance" },
        { status: 400 }
      );
    }

    await db.collection("leave_applications").insertOne({
      userId,
      userName: applicantUser.name || applicantUser.name || applicantUser.email || "",
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

    // Reserve days immediately after application submission.
    await db.collection("leave_balances").updateOne(
      {
        _id: leaveBalance._id,
        "leaves.leaveTypeId": leaveType.leaveTypeId,
      },
      {
        $inc: {
          "leaves.$.used": parsedDays,
          "leaves.$.balance": -parsedDays,
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ message: "Leave applied successfully" }, { status: 201 });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("POST /api/apply-leave error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}