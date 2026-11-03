import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, context: any) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const params = await context.params;
    const id = params.id; 
    
    const updated = await Feedback.findByIdAndUpdate(id, body, { new: true });
    
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