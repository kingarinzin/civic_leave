// src/app/api/room-booking/family/my/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const items = await db
      .collection("rb_family_registry")
      .find({ staffId: new ObjectId(auth.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      items: items.map((i) => ({
        ...i,
        _id: i._id.toString(),
        staffId: i.staffId.toString(),
        verifiedByStaffId: i.verifiedByStaffId
          ? i.verifiedByStaffId.toString()
          : null,
      })),
    });
  } catch (error: any) {
    console.error("GET /family/my error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}