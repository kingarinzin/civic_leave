import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramCost from "@/models/ProgramCost";

export async function GET() {
  try {
    await connectToDatabase();
    const costs = await ProgramCost.find().sort({ programCostType: 1 });
    return NextResponse.json(costs);
  } catch (error) {
    console.error("GET /api/hr/program-cost error:", error);
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
    const { programCostType, totalAmount, remarks } = body;

    if (!programCostType || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Program Cost Type and Total Amount are required" },
        { status: 400 }
      );
    }

    // Check for duplicate programCostType
    const existing = await ProgramCost.findOne({
      programCostType: programCostType.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Program Cost Type already exists" },
        { status: 409 }
      );
    }

    const newCost = await ProgramCost.create({
      programCostType: programCostType.trim(),
      totalAmount: Number(totalAmount),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newCost, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/program-cost error:", error);
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
    const { _id, programCostType, totalAmount, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    // Check duplicate excluding self
    if (programCostType) {
      const existing = await ProgramCost.findOne({
        programCostType: programCostType.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Program Cost Type already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await ProgramCost.findByIdAndUpdate(
      _id,
      {
        programCostType: programCostType?.trim(),
        totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Program Cost not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/program-cost error:", error);
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

    const deleted = await ProgramCost.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Program Cost not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/program-cost error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}