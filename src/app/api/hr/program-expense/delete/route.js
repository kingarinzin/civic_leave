import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramExpense from "@/models/ProgramExpense";
import mongoose from "mongoose";

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id } = body;

    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "Valid ID is required" }, { status: 400 });
    }

    const deleted = await ProgramExpense.findByIdAndDelete(_id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE program expense error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}