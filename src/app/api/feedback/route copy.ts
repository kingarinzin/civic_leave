import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; // Use your existing function
import Feedback from "@/models/Feedback";

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectToDatabase(); // Connects both Native + Mongoose
  try {
    const feedbacks = await Feedback.find({}).sort({ _id: -1 });
    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connectToDatabase(); // Connects both Native + Mongoose
  try {
    const body = await req.json();
    const newFeedback = await Feedback.create(body);
    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Failed to create bug" }, { status: 500 });
  }
}