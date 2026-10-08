import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/admin-auth";

// Fixed list of roles used across the app.
// If you add new roles later, add them here.
const ALL_ROLES = [
  "Officer",
  "DivisionHead",
  "DepartmentHead",
  "Commissioner",
  "Chairperson",
  "SecretaryService",
  "Admin",
];

export async function GET(req) {
  try {
    // 🔐 1. Admin only
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.valid) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 403 }
      );
    }

    // 🔌 2. Connect DB
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // 📦 3. Fetch everything in parallel
    const [docTypesRaw, divisionsRaw, departmentsRaw] = await Promise.all([
      db
        .collection("documenttypes")
        .find({})
        .sort({ documentType: 1 })
        .toArray(),
      db.collection("divisions").find({}).toArray(),
      db.collection("departments").find({}).toArray(),
    ]);

    // 🔄 4. Normalize document types
    const documentTypes = docTypesRaw.map((d) => ({
      _id: d._id.toString(),
      name: d.documentType || "",
      remarks: d.remarks || "",
      allowed: {
        emails: Array.isArray(d.allowed?.emails) ? d.allowed.emails : [],
        divisions: Array.isArray(d.allowed?.divisions)
          ? d.allowed.divisions.map((x) => x.toString())
          : [],
        departments: Array.isArray(d.allowed?.departments)
          ? d.allowed.departments.map((x) => x.toString())
          : [],
        roles: Array.isArray(d.allowed?.roles) ? d.allowed.roles : [],
      },
    }));

    // 🔄 5. Normalize divisions
    const allDivisions = divisionsRaw.map((d) => ({
      _id: d._id.toString(),
      name: d.name || "",
      departmentId: d.departmentId ? d.departmentId.toString() : "",
    }));

    // 🔄 6. Normalize departments
    const allDepartments = departmentsRaw.map((d) => ({
      _id: d._id.toString(),
      name: d.name || "",
    }));

    // 📤 7. Response
    return NextResponse.json({
      documentTypes,
      allDivisions,
      allDepartments,
      allRoles: ALL_ROLES,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/meetings/document-type-access error:",
      error
    );
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
