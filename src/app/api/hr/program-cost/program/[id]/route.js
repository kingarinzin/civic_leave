import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramCost from "@/models/ProgramCost";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Program ID" }, { status: 400 });
    }

    const expenses = await ProgramCost.find({ programId: id }).sort({ createdAt: 1 });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await request.json();
    const { programCostType, totalAmount, remarks } = body;

    if (!programCostType || totalAmount === undefined) {
      return NextResponse.json({ error: "Cost Type and Amount are required" }, { status: 400 });
    }

    // Create the new expense specific to this program
    const newExpense = await ProgramCost.create({
      programId: id, // <--- THIS IS CRUCIAL
      programCostType: programCostType.trim(),
      totalAmount: Number(totalAmount),
      remarks: remarks?.trim() || "",
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error("POST program cost error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}