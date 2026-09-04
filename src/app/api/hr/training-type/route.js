import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TrainingType from "@/models/TrainingType";

export async function GET() {
  try {
    await connectToDatabase();
    const types = await TrainingType.find().sort({ trainingType: 1 });
    return NextResponse.json(types);
  } catch (error) {
    console.error("GET /api/hr/training-type error:", error);
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
    const { trainingType, remarks } = body;

    if (!trainingType) {
      return NextResponse.json(
        { error: "Training Type is required" },
        { status: 400 }
      );
    }

    // Optional: check for duplicate trainingType
    const existing = await TrainingType.findOne({
      trainingType: trainingType.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Training Type already exists" },
        { status: 409 }
      );
    }

    const newType = await TrainingType.create({
      trainingType: trainingType.trim(),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/training-type error:", error);
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
    const { _id, trainingType, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    // Check duplicate excluding self
    if (trainingType) {
      const existing = await TrainingType.findOne({
        trainingType: trainingType.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Training Type already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await TrainingType.findByIdAndUpdate(
      _id,
      {
        trainingType: trainingType?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Training Type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/training-type error:", error);
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

    const deleted = await TrainingType.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Training Type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/training-type error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}