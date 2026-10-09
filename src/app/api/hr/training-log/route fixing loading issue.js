import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

import TrainingLog from "@/models/TrainingLog";
import ProgramTitle from "@/models/ProgramTitle";
import FundingAgency from "@/models/FundingAgency";
import FundingModality from "@/models/FundingModality";
import Institution from "@/models/Institution";
import { Employee } from "@/models/Employee";
import TrainingType from "@/models/TrainingType";

mongoose.model("ProgramTitle", ProgramTitle.schema);
mongoose.model("FundingAgency", FundingAgency.schema);
mongoose.model("FundingModality", FundingModality.schema);
mongoose.model("Institution", Institution.schema);
mongoose.model("Employee", Employee.schema);
mongoose.model("TrainingType", TrainingType.schema);

// ─── GET ─────────────────────────────────────────────
export async function GET() {
  try {
    await connectToDatabase();

    const logs = await TrainingLog.find()
      .populate({
        path: "programTitle",
        select: "title trainingId locationCategory trainingGroup description",
        populate: {
          path: "trainingType",
          select: "trainingType"
        }
      })
      .populate("fundingAgency", "name")
      .populate("fundingModality", "name")
      .populate("institution", "name")
      .populate("employees", "fullName cidNumber positionTitle passportPhoto employeeNumber email positionLevel subLevel")
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

    const required = [
      "programTitle",
      "startDate",
      "endDate",
      "fundingAgency",
      "fundingModality",
      "institution",
      "place",
      "country",
      "numberOfParticipants",
      "totalCost",
    ];
    const missing = required.filter((f) => !body[f]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const idFields = [
      "programTitle",
      "fundingAgency",
      "fundingModality",
      "institution",
    ];
    for (const f of idFields) {
      if (!mongoose.Types.ObjectId.isValid(body[f])) {
        return NextResponse.json({ error: `Invalid ${f} ID` }, { status: 400 });
      }
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const participants = Number(body.numberOfParticipants);
    const cost = Number(body.totalCost);
    if (participants < 1 || cost < 0) {
      return NextResponse.json({ error: "Invalid numbers" }, { status: 400 });
    }

    let employeeIds = [];
    if (body.employees && Array.isArray(body.employees)) {
      for (const empId of body.employees) {
        if (!mongoose.Types.ObjectId.isValid(empId)) {
          return NextResponse.json(
            { error: `Invalid employee ID: ${empId}` },
            { status: 400 }
          );
        }
        employeeIds.push(empId);
      }
    }

    const newLog = await TrainingLog.create({
      programTitle: body.programTitle,
      startDate,
      endDate,
      fundingAgency: body.fundingAgency,
      fundingModality: body.fundingModality,
      institution: body.institution,
      place: body.place.trim(),
      country: body.country,
      numberOfParticipants: participants,
      totalCost: cost,
      hrcReference: body.hrcReference?.trim() || "",
      status: body.status || "Scheduled",
      certification: body.certification || false,
      employees: employeeIds,
    });

    await newLog.populate([
      {
        path: "programTitle",
        select: "title trainingId locationCategory trainingGroup description",
        populate: {
          path: "trainingType",
          select: "trainingType"
        }
      },
      { path: "fundingAgency", select: "name" },
      { path: "fundingModality", select: "name" },
      { path: "institution", select: "name" },
      { path: "employees", select: "fullName cidNumber positionTitle passportPhoto employeeNumber email positionLevel subLevel" },
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

    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }

    if (update.employees && Array.isArray(update.employees)) {
      for (const empId of update.employees) {
        if (!mongoose.Types.ObjectId.isValid(empId)) {
          return NextResponse.json(
            { error: `Invalid employee ID: ${empId}` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await TrainingLog.findByIdAndUpdate(_id, update, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "programTitle",
        select: "title trainingId locationCategory trainingGroup description",
        populate: {
          path: "trainingType",
          select: "trainingType"
        }
      })
      .populate("fundingAgency", "name")
      .populate("fundingModality", "name")
      .populate("institution", "name")
      .populate("employees", "fullName cidNumber positionTitle passportPhoto employeeNumber email positionLevel subLevel");

    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const { _id } = await request.json();
    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }
    const deleted = await TrainingLog.findByIdAndDelete(_id);
    if (!deleted)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}