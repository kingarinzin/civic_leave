import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MeetingDocument from "@/models/MeetingDocument";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const commission = searchParams.get("commission");
    const year = searchParams.get("year");

    const filter = {};
    if (type) filter.document_type = type;
    if (commission) filter.commission = commission;
    if (year) filter.year = year;

    const documents = await MeetingDocument.find(filter).sort({ display_order: 1 });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file");
    const display_order = formData.get("display_order");
    const document_type = formData.get("document_type");
    const commission = formData.get("commission");
    const year = formData.get("year");
    const subject = formData.get("subject");
    const date = formData.get("date");

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;

    const uploadDir = path.join(process.cwd(), "public/uploads/minutes");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const newDoc = await MeetingDocument.create({
      display_order: parseInt(display_order) || 999,
      date: date || new Date().toISOString().split("T")[0],
      document_type,
      commission,
      year,
      subject,
      file_url: `/uploads/minutes/${filename}`,
      original_filename: file.name,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      display_order,
      document_type,
      commission,
      year,
      date,
      subject,
      fileBase64,
      fileName,
      removeExisting,
    } = body;

    const doc = await MeetingDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (display_order !== undefined) doc.display_order = parseInt(display_order) || doc.display_order;
    if (document_type) doc.document_type = document_type;
    if (commission) doc.commission = commission;
    if (year) doc.year = year;
    if (date) doc.date = date;
    if (subject) doc.subject = subject;

    if (fileBase64 && fileName) {
      const oldPath = path.join(process.cwd(), "public", doc.file_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      const buffer = Buffer.from(fileBase64.split(",")[1], "base64");
      const filename = `${Date.now()}-${fileName}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/minutes");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      doc.file_url = `/uploads/minutes/${filename}`;
      doc.original_filename = fileName;
    } else if (removeExisting) {
      return NextResponse.json(
        { error: "You removed the file but did not upload a new one." },
        { status: 400 }
      );
    }

    await doc.save();
    return NextResponse.json(doc);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const doc = await MeetingDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", doc.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await doc.deleteOne();
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
