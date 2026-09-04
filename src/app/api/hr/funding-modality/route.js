import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FundingModality from "@/models/FundingModality";

export async function GET() {
  try {
    await connectToDatabase();
    const modalities = await FundingModality.find().sort({ name: 1 });
    return NextResponse.json(modalities);
  } catch (error) {
    console.error("GET /api/hr/funding-modality error:", error);
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
    const { name, remarks } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Funding Modality name is required" },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await FundingModality.findOne({
      name: name.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Funding Modality already exists" },
        { status: 409 }
      );
    }

    const newModality = await FundingModality.create({
      name: name.trim(),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newModality, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/funding-modality error:", error);
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
    const { _id, name, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    // Check duplicate excluding self
    if (name && name.trim()) {
      const existing = await FundingModality.findOne({
        name: name.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Funding Modality already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await FundingModality.findByIdAndUpdate(
      _id,
      {
        name: name?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Funding Modality not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/funding-modality error:", error);
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

    const deleted = await FundingModality.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Funding Modality not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/funding-modality error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}