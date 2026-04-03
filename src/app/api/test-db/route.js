import { dbConnect } from "@/lib/dbConnect";
import mongoose from "mongoose";

export async function GET() {
  try {
    await dbConnect();

    return Response.json({
      success: true,
      message: "MongoDB connected",
      db: mongoose.connection.name,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}