import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

import ProgramTitle from "@/models/ProgramTitle";
import TrainingType from "@/models/TrainingType"; // adjust path if needed

// Register models (optional)
mongoose.model("ProgramTitle", ProgramTitle.schema);
mongoose.model("TrainingType", TrainingType.schema);

// ─── GET (list) ──────────────────────────────────────
export async function GET(request) {
  try {
    await connectToDatabase();

    // Get query params if any (e.g., for single item)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch single program by ID
      const program = await ProgramTitle.findById(id)
        .populate("trainingType", "name");
      if (!program) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }
      return NextResponse.json(program);
    }

    // Fetch all programs
    const programs = await ProgramTitle.find()
      .populate("trainingType", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(programs);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program titles", details: error.message },
      { status: 500 }
    );
  }
}

// ─── POST ────────────────────────────────────────────
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Validate required fields (adjust to your schema)
    const required = ["trainingId", "title", "locationCategory", "trainingGroup"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const newProgram = await ProgramTitle.create(body);
    await newProgram.populate("trainingType", "name");

    return NextResponse.json(newProgram, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────
export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, ...update } = body;

    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }

    const updated = await ProgramTitle.findByIdAndUpdate(_id, update, {
      new: true,
      runValidators: true,
    }).populate("trainingType", "name");

    if (!updated)
      return NextResponse.json({ error: "Program not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────
export async function DELETE(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }

    const deleted = await ProgramTitle.findByIdAndDelete(id);
    if (!deleted)
      return NextResponse.json({ error: "Program not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}