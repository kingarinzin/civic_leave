import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramCost from "@/models/ProgramCost";
import mongoose from "mongoose";

// GET: Fetch all costs for a specific program
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Program ID" }, { status: 400 });
    }

    const costs = await ProgramCost.find({ programId: id }).sort({ createdAt: 1 });
    return NextResponse.json(costs);
  } catch (error) {
    console.error("GET program costs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Add a new cost for a specific program
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();
    const { programCostType, totalAmount, remarks } = body;

    if (!programCostType || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Cost Type and Total Amount are required" },
        { status: 400 }
      );
    }

    // Check for duplicate cost type for this specific program
    const existing = await ProgramCost.findOne({
      programId: id,
      programCostType: programCostType.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "This cost type is already added for this program" },
        { status: 409 }
      );
    }

    const newCost = await ProgramCost.create({
      programId: id,
      programCostType: programCostType.trim(),
      totalAmount: Number(totalAmount),
      remarks: remarks?.trim() || "",
    });

    return NextResponse.json(newCost, { status: 201 });
  } catch (error) {
    console.error("POST program cost error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}