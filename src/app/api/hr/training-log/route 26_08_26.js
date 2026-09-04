import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

// Import all referenced models
import TrainingLog from "@/models/TrainingLog";
import ProgramTitle from "@/models/ProgramTitle";
import FundingAgency from "@/models/FundingAgency";
import FundingModality from "@/models/FundingModality";
import Institution from "@/models/Institution";

// Force registration (optional but safe)
mongoose.model("ProgramTitle", ProgramTitle.schema);
mongoose.model("FundingAgency", FundingAgency.schema);
mongoose.model("FundingModality", FundingModality.schema);
mongoose.model("Institution", Institution.schema);

// ─── GET ─────────────────────────────────────────────
export async function GET() {
  try {
    await connectToDatabase();

    const logs = await TrainingLog.find()
      .populate("programTitle", "title trainingId locationCategory trainingGroup description") // ← description added
      .populate("fundingAgency", "name")
      .populate("fundingModality", "name")
      .populate("institution", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch training logs", details: error.message },
      { status: 500 }
    );
  }
}

// ─── POST ────────────────────────────────────────────
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // ... validation (unchanged) ...

    const newLog = await TrainingLog.create({ /* ... */ });

    await newLog.populate([
      { path: "programTitle", select: "title trainingId locationCategory trainingGroup description" }, // ← added description
      { path: "fundingAgency", select: "name" },
      { path: "fundingModality", select: "name" },
      { path: "institution", select: "name" },
    ]);

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PUT ────────────────────────────────────────────
export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, ...update } = body;
    // ... validation (unchanged) ...

    const updated = await TrainingLog.findByIdAndUpdate(_id, update, { new: true, runValidators: true })
      .populate("programTitle", "title trainingId locationCategory trainingGroup description") // ← added description
      .populate("fundingAgency", "name")
      .populate("fundingModality", "name")
      .populate("institution", "name");

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────
export async function DELETE(request) {
  // ... unchanged ...
}