import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, context: any) {
  await connectToDatabase();
  try {
    const params = await context.params;
    const id = params.id;

    const formData = await req.formData();
    
    // 1. Extract text fields
    const data: any = {};
    formData.forEach((value, key) => {
      if (key !== "attachments" && key !== "existingAttachments" && key !== "_id") {
        data[key] = value;
      }
    });

    // 2. Get the files that the user KEPT (did not click the red X on)
    let finalAttachments: string[] = [];
    const existingStr = formData.get("existingAttachments");
    if (existingStr) {
      try {
        finalAttachments = JSON.parse(existingStr as string);
      } catch (e) {
        finalAttachments = [];
      }
    }

    // 3. Handle NEW file uploads
    const newAttachments = formData.getAll("attachments") as File[];
    const uploadDir = path.join(process.cwd(), "public/uploads/feedback");

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    for (const file of newAttachments) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        await writeFile(path.join(uploadDir, uniqueName), buffer);
        // Add the new file to the array of kept files
        finalAttachments.push(uniqueName);
      }
    }

    // 4. Set the final combined array
    data.attachments = finalAttachments;

    const updated = await Feedback.findByIdAndUpdate(id, data, { new: true });
    
    if (!updated) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  await connectToDatabase();
  try {
    const params = await context.params;
    const id = params.id;
    
    const deleted = await Feedback.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}