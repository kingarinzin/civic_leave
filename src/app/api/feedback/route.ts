import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectToDatabase();
  try {
    // .lean() is CRITICAL here to pass the attachments array correctly to the frontend
    const feedbacks = await Feedback.find({}).sort({ _id: -1 }).lean();
    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  try {
    const formData = await req.formData();
    
    // Extract text fields
    const data: any = {};
    formData.forEach((value, key) => {
      if (key !== "attachments") data[key] = value;
    });

    // Handle file uploads
    const attachments = formData.getAll("attachments") as File[];
    const fileNames: string[] = [];
    const uploadDir = path.join(process.cwd(), "public/uploads/feedback");

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    for (const file of attachments) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Create a unique file name to prevent overwriting
        const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        await writeFile(path.join(uploadDir, uniqueName), buffer);
        fileNames.push(uniqueName);
      }
    }

    data.attachments = fileNames;

    const newFeedback = await Feedback.create(data);
    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Failed to create bug" }, { status: 500 });
  }
}