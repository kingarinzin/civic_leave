import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ProgramTitle from "@/models/ProgramTitle";
import TrainingType from "@/models/TrainingType";

// ---- Helpers for Training ID generation ----
const getTrainingGroupAbbr = (full) => {
  if (full.startsWith("STT")) return "STT";
  if (full.startsWith("LTT")) return "LTT";
  return full;
};

const getLocationAbbr = (full) => {
  if (full === "In-Country") return "INC";
  if (full === "Ex-Country") return "EXC";
  return full;
};

const generateTrainingId = async (trainingGroup, locationCategory) => {
  const groupAbbr = getTrainingGroupAbbr(trainingGroup);
  const locAbbr = getLocationAbbr(locationCategory);
  const prefix = `HRD-${groupAbbr}${locAbbr}-`;

  // Aggregate to find the numeric max suffix (not string max)
  const latest = await ProgramTitle.aggregate([
    { $match: { trainingId: { $regex: `^${prefix}\\d+$` } } },
    {
      $project: {
        num: {
          $toInt: { $arrayElemAt: [{ $split: ["$trainingId", "-"] }, -1] },
        },
      },
    },
    { $sort: { num: -1 } },
    { $limit: 1 },
  ]);

  const nextNumber = latest.length > 0 ? latest[0].num + 1 : 1;
  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}${padded}`;
};

// ---- GET (list or single) ----
export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const program = await ProgramTitle.findById(id)
        .populate("trainingType", "name");
      if (!program) {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(program);
    }

    const titles = await ProgramTitle.find()
      .populate("trainingType", "name")
      .sort({ title: 1 });

    return NextResponse.json(titles);
  } catch (error) {
    console.error("GET /api/hr/program-title error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ---- POST ----
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { title, description, locationCategory, trainingGroup, trainingType } = body;

    if (!title || !locationCategory || !trainingGroup || !trainingType) {
      return NextResponse.json(
        { error: "Title, Location Category, Training Group, and Training Type are required" },
        { status: 400 }
      );
    }

    const trainingTypeExists = await TrainingType.findById(trainingType);
    if (!trainingTypeExists) {
      return NextResponse.json(
        { error: "Invalid Training Type selected" },
        { status: 400 }
      );
    }

    // Retry loop to handle duplicate-key races on trainingId
    let newTitle = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const trainingId = await generateTrainingId(trainingGroup, locationCategory);
      try {
        newTitle = await ProgramTitle.create({
          title,
          description,
          locationCategory,
          trainingGroup,
          trainingType,
          trainingId,
        });
        break;
      } catch (err) {
        if (err.code === 11000) {
          lastErr = err;
          continue; // duplicate → recompute and try again
        }
        throw err;
      }
    }

    if (!newTitle) {
      throw lastErr || new Error("Could not generate a unique Training ID");
    }

    await newTitle.populate("trainingType", "name");

    return NextResponse.json(newTitle, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/program-title error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ---- PUT ----
export async function PUT(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, title, description, locationCategory, trainingGroup, trainingType } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    if (trainingType) {
      const trainingTypeExists = await TrainingType.findById(trainingType);
      if (!trainingTypeExists) {
        return NextResponse.json(
          { error: "Invalid Training Type selected" },
          { status: 400 }
        );
      }
    }

    const updated = await ProgramTitle.findByIdAndUpdate(
      _id,
      { title, description, locationCategory, trainingGroup, trainingType },
      { new: true, runValidators: true }
    ).populate("trainingType", "name");

    if (!updated) {
      return NextResponse.json(
        { error: "Program Title not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/hr/program-title error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ---- DELETE ----
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

    const deleted = await ProgramTitle.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Program Title not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/hr/program-title error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}