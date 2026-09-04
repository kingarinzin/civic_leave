import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Institution from "@/models/Institution";

export async function GET() {
  try {
    await connectToDatabase();
    const institutions = await Institution.find().sort({ name: 1 });
    return NextResponse.json(institutions);
  } catch (error) {
    console.error("GET /api/hr/institution error:", error);
    return NextResponse.json(
      { error: "Failed to fetch institutions", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, remarks } = body;

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Institution name is required" },
        { status: 400 }
      );
    }

    // Check duplicate (early validation)
    const existing = await Institution.findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { error: "Institution already exists" },
        { status: 409 }
      );
    }

    const newInstitution = await Institution.create({
      name: name.trim(),
      remarks: remarks?.trim() || "",
    });

    return NextResponse.json(newInstitution, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/institution error:", error);
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Institution already exists (duplicate key)" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create institution", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, name, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    // Check duplicate excluding self
    if (name && name.trim()) {
      const existing = await Institution.findOne({
        name: name.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Institution already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await Institution.findByIdAndUpdate(
      _id,
      {
        name: name?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Institution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/institution error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Institution already exists (duplicate key)" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update institution", details: error.message },
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

    const deleted = await Institution.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Institution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/institution error:", error);
    return NextResponse.json(
      { error: "Failed to delete institution", details: error.message },
      { status: 500 }
    );
  }
}