import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import DocumentType from "@/models/DocumentType";

export async function GET() {
  try {
    await connectToDatabase();
    const types = await DocumentType.find().sort({ documentType: 1 });
    return NextResponse.json(types);
  } catch (error) {
    console.error("GET /api/meetings/document-type error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { documentType, remarks } = body;

    if (!documentType) {
      return NextResponse.json(
        { error: "Document Type is required" },
        { status: 400 }
      );
    }

    const existing = await DocumentType.findOne({
      documentType: documentType.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Document Type already exists" },
        { status: 409 }
      );
    }

    const newType = await DocumentType.create({
      documentType: documentType.trim(),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    console.error("POST /api/meetings/document-type error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, documentType, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    if (documentType) {
      const existing = await DocumentType.findOne({
        documentType: documentType.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Document Type already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await DocumentType.findByIdAndUpdate(
      _id,
      {
        documentType: documentType?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Document Type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/meetings/document-type error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for deletion" },
        { status: 400 }
      );
    }

    const deleted = await DocumentType.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Document Type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/meetings/document-type error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}