import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <-- FIXED HERE FOR NEXT.JS 16
) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params; // <-- FIXED HERE FOR NEXT.JS 16
    const { action } = await req.json();

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const newStatus = action === "APPROVE" ? "PAID" : "UNPAID";

    const result = await db.collection("rb_ledger").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: newStatus,
          verifiedBy: auth.user.email,
          verifiedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}