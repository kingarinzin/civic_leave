import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { DATABASE_NAME } from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

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

function toObjectId(value: string): ObjectId | null {
  try {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const [departments, commissioners, assignments] = await Promise.all([
      db.collection("departments").find({}).sort({ name: 1 }).toArray(),
      db
        .collection("users")
        .find({ role: "Commissioner", isActive: { $ne: false } })
        .sort({ name: 1 })
        .toArray(),
      db.collection("commissioner_assignments").find({}).toArray(),
    ]);

    const assignmentMap = new Map(
      assignments.map((item) => [normalizeId(item.departmentId), normalizeId(item.commissionerId)])
    );

    const mapped = departments.map((dept) => {
      const departmentId = normalizeId(dept._id);
      const commissionerId = assignmentMap.get(departmentId) || "";
      const commissioner = commissioners.find(
        (c) => normalizeId(c._id) === commissionerId,
      );

      return {
        departmentId,
        departmentName: dept.name || "-",
        commissionerId,
        commissionerName:
          commissioner?.name || commissioner?.name || commissioner?.email || "Unassigned",
      };
    });

    const commissionerOptions = commissioners.map((c) => ({
      _id: normalizeId(c._id),
      name: c.name || c.name || c.email || "Commissioner",
      email: c.email || "",
    }));

    return NextResponse.json({
      assignments: mapped,
      commissioners: commissionerOptions,
    });
  } catch (error) {
    console.error("GET /api/admin/commissioner-assignments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const { departmentId, commissionerId } = await req.json();
    if (!departmentId || !commissionerId) {
      return NextResponse.json(
        { error: "Department and Commissioner are required" },
        { status: 400 },
      );
    }

    const parsedDepartmentId = toObjectId(departmentId);
    const parsedCommissionerId = toObjectId(commissionerId);

    if (!parsedDepartmentId || !parsedCommissionerId) {
      return NextResponse.json({ error: "Invalid IDs supplied" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const [department, commissioner] = await Promise.all([
      db.collection("departments").findOne({ _id: parsedDepartmentId }),
      db.collection("users").findOne({ _id: parsedCommissionerId, role: "Commissioner" }),
    ]);

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    if (!commissioner) {
      return NextResponse.json({ error: "Commissioner not found" }, { status: 404 });
    }

    await db.collection("commissioner_assignments").updateOne(
      { departmentId: parsedDepartmentId },
      {
        $set: {
          departmentId: parsedDepartmentId,
          commissionerId: parsedCommissionerId,
          updatedAt: new Date(),
          updatedBy: new ObjectId(adminCheck.userId),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ success: true, message: "Commissioner assignment saved" });
  } catch (error) {
    console.error("POST /api/admin/commissioner-assignments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
