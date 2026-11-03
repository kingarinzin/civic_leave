import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramExpense from "@/models/ProgramExpense";
import mongoose from "mongoose";

// GET: Fetch all expenses for a specific program
export async function GET(request, context) {
  try {
    await connectToDatabase();
    
    // Safely extract ID (handles Next.js 14+ where params is a promise)
    const params = await context.params;
    const id = params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Program ID" }, { status: 400 });
    }

    const expenses = await ProgramExpense.find({ programId: id }).sort({ createdAt: 1 });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET program expenses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new expense for a specific program
export async function POST(request, context) {
  try {
    await connectToDatabase();
    
    // Safely extract ID
    const params = await context.params;
    const id = params.id;

    const body = await request.json();
    const { programCostType, totalAmount, remarks } = body;

    if (!programCostType || totalAmount === undefined) {
      return NextResponse.json({ error: "Cost Type and Amount are required" }, { status: 400 });
    }

    // Create the new expense with the programId explicitly set
    const newExpense = await ProgramExpense.create({
      programId: id, // <--- This will now have the correct ID
      programCostType: programCostType.trim(),
      totalAmount: Number(totalAmount),
      remarks: remarks?.trim() || "",
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error("POST program expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}