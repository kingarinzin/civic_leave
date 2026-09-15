import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentType from "@/models/DocumentType";
import Commission from "@/models/Commission";
import Department from "@/models/Department";
import Division from "@/models/Division";

export async function GET() {
  try {
    await connectToDatabase();

    const [documentTypes, commissions, departments, divisions] = await Promise.all([
      DocumentType.find({}).select("documentType _id").lean(),
      Commission.find({}).select("commission _id").lean(),
      Department.find({}).select("name _id").lean(),
      Division.find({}).select("name departmentId _id").lean(),
    ]);

    const types = documentTypes.map((doc) => ({
      id: doc._id,
      name: doc.documentType,
    }));

    const comms = commissions.map((comm) => ({
      id: comm._id,
      name: comm.commission,
    }));

    const depts = departments.map((dept) => ({
      id: dept._id,
      name: dept.name,
    }));

    const divs = divisions.map((div) => ({
      id: div._id,
      name: div.name,
      departmentId: div.departmentId,
    }));

    return NextResponse.json({
      documentTypes: types,
      commissions: comms,
      departments: depts,
      divisions: divs,
    });
  } catch (error) {
    console.error("GET /api/meetings/documents_dropdowns error:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal Server Error",
        documentTypes: [],
        commissions: [],
        departments: [],
        divisions: [],
      },
      { status: 500 }
    );
  }
}