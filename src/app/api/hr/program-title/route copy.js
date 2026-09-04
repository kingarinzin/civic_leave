import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";  // named import
import ProgramTitle from "@/models/ProgramTitle";

export async function GET() {
  try {
    await connectToDatabase();  // now it's a function
    const titles = await ProgramTitle.find().sort({ title: 1 });
    return NextResponse.json(titles);
  } catch (error) {
    console.error("GET /api/hr/program-title error:", error);
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
    const { title, code, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const newTitle = await ProgramTitle.create({ title, code, description });
    return NextResponse.json(newTitle, { status: 201 });
  } catch (error) {
    console.error("POST /api/hr/program-title error:", error);
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
    const { _id, title, code, description } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    const updated = await ProgramTitle.findByIdAndUpdate(
      _id,
      { title, code, description },
      { new: true, runValidators: true }
    );

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