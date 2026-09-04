import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FundingAgency from "@/models/FundingAgency";

export async function GET() {
  try {
    await connectToDatabase();
    const agencies = await FundingAgency.find().sort({ name: 1 });
    return NextResponse.json(agencies);
  } catch (error) {
    console.error("GET /api/hr/funding-agency error:", error);
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
        { error: "Funding Agency name is required" },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await FundingAgency.findOne({
      name: name.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Funding Agency already exists" },
        { status: 409 }
      );
    }

    const newAgency = await FundingAgency.create({
      name: name.trim(),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newAgency, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/funding-agency error:", error);
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
      const existing = await FundingAgency.findOne({
        name: name.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Funding Agency already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await FundingAgency.findByIdAndUpdate(
      _id,
      {
        name: name?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Funding Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/funding-agency error:", error);
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

    const deleted = await FundingAgency.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Funding Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/funding-agency error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}