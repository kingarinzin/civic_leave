import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Commission from "@/models/Commission";

export async function GET() {
  try {
    await connectToDatabase();
    const commissions = await Commission.find().sort({ commission: 1 });
    return NextResponse.json(commissions);
  } catch (error) {
    console.error("GET /api/meetings/commission error:", error);
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
    const { commission, remarks } = body;

    if (!commission) {
      return NextResponse.json(
        { error: "Commission is required" },
        { status: 400 }
      );
    }

    const existing = await Commission.findOne({
      commission: commission.trim(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Commission already exists" },
        { status: 409 }
      );
    }

    const newCommission = await Commission.create({
      commission: commission.trim(),
      remarks: remarks?.trim() || "",
    });
    return NextResponse.json(newCommission, { status: 201 });
  } catch (error) {
    console.error("POST /api/meetings/commission error:", error);
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
    const { _id, commission, remarks } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "ID is required for update" },
        { status: 400 }
      );
    }

    if (commission) {
      const existing = await Commission.findOne({
        commission: commission.trim(),
        _id: { $ne: _id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Commission already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await Commission.findByIdAndUpdate(
      _id,
      {
        commission: commission?.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/meetings/commission error:", error);
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

    const deleted = await Commission.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/meetings/commission error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}