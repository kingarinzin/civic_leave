import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { DATABASE_NAME } from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

function normalizeId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (typeof value === "object" && value !== null) {
    if ("toString" in value && typeof (value as any).toString === "function") {
      try {
        return (value as any).toString();
      } catch {
        return "";
      }
    }
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

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "department"; // "department" or "division"

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    // Common: fetch active commissioners
    const commissioners = await db
      .collection("users")
      .find({ role: "Commissioner", isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray();

    const commissionerOptions = commissioners.map((c) => ({
      _id: normalizeId(c._id),
      name: c.name || c.email || "Commissioner",
      email: c.email || "",
    }));

    if (type === "department") {
      // --- Departments (existing logic) ---
      const departments = await db
        .collection("departments")
        .find({})
        .sort({ name: 1 })
        .toArray();

      const assignments = await db
        .collection("commissioner_assignments")
        .find({})
        .toArray();

      const assignmentMap = new Map<string, string>();
      assignments.forEach((item) => {
        const deptId = normalizeId(item.departmentId);
        const commId = normalizeId(item.commissionerId);
        if (deptId && commId) assignmentMap.set(deptId, commId);
      });

      const mapped = departments.map((dept) => {
        const departmentId = normalizeId(dept._id);
        const commissionerId = assignmentMap.get(departmentId) || "";
        const commissioner = commissioners.find(
          (c) => normalizeId(c._id) === commissionerId
        );
        return {
          departmentId,
          departmentName: dept.name || "-",
          commissionerId,
          commissionerName: commissioner?.name || commissioner?.email || "Unassigned",
        };
      });

      return NextResponse.json({
        assignments: mapped,
        commissioners: commissionerOptions,
      });
    } 
    else if (type === "division") {
      // --- Divisions (new logic) ---
      const divisions = await db
        .collection("divisions")
        .find({})
        .sort({ name: 1 })
        .toArray();

      const assignments = await db
        .collection("division_commissioner_assignments")
        .find({})
        .toArray();

      const assignmentMap = new Map<string, string>();
      assignments.forEach((item) => {
        const divId = normalizeId(item.divisionId);
        const commId = normalizeId(item.commissionerId);
        if (divId && commId) assignmentMap.set(divId, commId);
      });

      // Fetch division heads (users with role DivisionHead)
      const divisionHeads = await db
        .collection("users")
        .find({ role: "DivisionHead", isActive: { $ne: false } })
        .toArray();

      // Build map: divisionId -> division head user document
      const divisionHeadMap = new Map<string, any>();
      divisionHeads.forEach((head) => {
        // Assumes each division head has a field `divisionId` referencing the division
        const divId = normalizeId(head.divisionId);
        if (divId) divisionHeadMap.set(divId, head);
      });

      const mapped = divisions.map((div) => {
        const divisionId = normalizeId(div._id);
        const commissionerId = assignmentMap.get(divisionId) || "";
        const commissioner = commissioners.find(
          (c) => normalizeId(c._id) === commissionerId
        );
        const divisionHead = divisionHeadMap.get(divisionId);
        return {
          divisionId,
          divisionName: div.name || "-",
          divisionHeadId: divisionHead?._id ? normalizeId(divisionHead._id) : "",
          divisionHeadName: divisionHead?.name || "No head assigned",
          commissionerId,
          commissionerName: commissioner?.name || commissioner?.email || "Unassigned",
        };
      });

      return NextResponse.json({
        assignments: mapped,
        commissioners: commissionerOptions,
      });
    }
    else {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET /api/admin/commissioner-assignments error:", error);
    return NextResponse.json(
      { error: (error as any)?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "department";
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    if (type === "department") {
      const { departmentId, commissionerId } = body;
      if (!departmentId || !commissionerId) {
        return NextResponse.json(
          { error: "Department and Commissioner are required" },
          { status: 400 }
        );
      }

      const parsedDepartmentId = toObjectId(departmentId);
      const parsedCommissionerId = toObjectId(commissionerId);
      if (!parsedDepartmentId || !parsedCommissionerId) {
        return NextResponse.json({ error: "Invalid IDs supplied" }, { status: 400 });
      }

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
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      return NextResponse.json({ success: true, message: "Commissioner assignment saved" });
    }
    else if (type === "division") {
      const { divisionId, commissionerId } = body;
      if (!divisionId || !commissionerId) {
        return NextResponse.json(
          { error: "Division and Commissioner are required" },
          { status: 400 }
        );
      }

      const parsedDivisionId = toObjectId(divisionId);
      const parsedCommissionerId = toObjectId(commissionerId);
      if (!parsedDivisionId || !parsedCommissionerId) {
        return NextResponse.json({ error: "Invalid IDs supplied" }, { status: 400 });
      }

      const [division, commissioner] = await Promise.all([
        db.collection("divisions").findOne({ _id: parsedDivisionId }),
        db.collection("users").findOne({ _id: parsedCommissionerId, role: "Commissioner" }),
      ]);

      if (!division) {
        return NextResponse.json({ error: "Division not found" }, { status: 404 });
      }
      if (!commissioner) {
        return NextResponse.json({ error: "Commissioner not found" }, { status: 404 });
      }

      await db.collection("division_commissioner_assignments").updateOne(
        { divisionId: parsedDivisionId },
        {
          $set: {
            divisionId: parsedDivisionId,
            commissionerId: parsedCommissionerId,
            updatedAt: new Date(),
            updatedBy: new ObjectId(adminCheck.userId),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      return NextResponse.json({ success: true, message: "Division assignment saved" });
    }
    else {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/admin/commissioner-assignments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "department";
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    if (type === "department") {
      const { departmentId } = body;
      if (!departmentId) {
        return NextResponse.json({ error: "Department ID required" }, { status: 400 });
      }
      const parsedId = toObjectId(departmentId);
      if (!parsedId) {
        return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
      }
      await db.collection("commissioner_assignments").deleteOne({ departmentId: parsedId });
      return NextResponse.json({ success: true, message: "Department assignment deleted" });
    }
    else if (type === "division") {
      const { divisionId } = body;
      if (!divisionId) {
        return NextResponse.json({ error: "Division ID required" }, { status: 400 });
      }
      const parsedId = toObjectId(divisionId);
      if (!parsedId) {
        return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
      }
      await db.collection("division_commissioner_assignments").deleteOne({ divisionId: parsedId });
      return NextResponse.json({ success: true, message: "Division assignment deleted" });
    }
    else {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }
  } catch (error) {
    console.error("DELETE /api/admin/commissioner-assignments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}