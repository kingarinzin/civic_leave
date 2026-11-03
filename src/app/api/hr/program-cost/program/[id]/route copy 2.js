import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramCost from "@/models/ProgramCost";

export async function GET() {
  try {
    await connectToDatabase();
    const costs = await ProgramCost.find().sort({ programCostType: 1 });
    return NextResponse.json(costs);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { programCostType, remarks } = body;

    if (!programCostType) {
      return NextResponse.json(
        { error: "Program Cost Type is required" },
        { status: 400 }
      );
    }

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
      remarks: remarks?.trim() || "",
    });
    
    return NextResponse.json(newCost, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, programCostType, remarks } = body;

    if (!_id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

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
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const { _id } = await request.json();
    if (!_id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const deleted = await ProgramCost.findByIdAndDelete(_id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}