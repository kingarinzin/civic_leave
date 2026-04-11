import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

function getUserIdFromAuth(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

  if (!decoded?.id) {
    throw new Error("Unauthorized");
  }

  return decoded.id;
}

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromAuth(req);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // ✅ Fetch only current user's leaves
    const leaveApplications = await db
      .collection("leave_applications")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    // ✅ Fetch leave types for mapping
    const leaveTypes = await db.collection("leave-types").find({}).toArray();

    const leaveTypeMap = new Map(
      leaveTypes.map((lt) => [lt._id.toString(), lt.name])
    );

    // ✅ Fetch user (for name consistency)
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    const userName = user?.name || user?.email || "-";

     // ✅ Map response, ensuring attachment fields are included
    const mapped = leaveApplications.map((entry) => ({
      _id: entry._id.toString(),
      userName,
      leaveTypeName: entry.leaveTypeName || leaveTypeMap.get(entry.leaveTypeId?.toString()) || "-",
      fromDate: entry.fromDate,
      toDate: entry.toDate,
      days: entry.days,
      status: entry.status,
      approverName: entry.approverName,
      description: entry.description || "",
      attachments: entry.attachments || [],           // ✅ array of filenames
      attachmentName: entry.attachmentName || "",     // ✅ fallback comma-separated string
      // ... include any other fields you need (isHalfDay, createdAt, etc.)
    }));

    return NextResponse.json({ applications: mapped });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/my-leaves error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}