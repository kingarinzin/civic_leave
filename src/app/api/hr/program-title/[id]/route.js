import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import ProgramTitle from "@/models/ProgramTitle";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const program = await ProgramTitle.findById(id).populate("trainingType", "trainingType");
    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(program);
  } catch (error) {
    console.error("GET program/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}