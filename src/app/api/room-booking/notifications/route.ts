// src/app/api/room-booking/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";

/**
 * GET /api/room-booking/notifications
 * Recent audit-logged actions relevant to this user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    // Get user's own bookings + own family registry
    const [bookings, families] = await Promise.all([
      db.collection("rb_bookings").find({ bookedByStaffId: new ObjectId(auth.user.userId) }).project({ _id: 1 }).toArray(),
      db.collection("rb_family_registry").find({ staffId: new ObjectId(auth.user.userId) }).project({ _id: 1 }).toArray(),
    ]);

    const bookingIds = bookings.map((b) => b._id);
    const familyIds = families.map((f) => f._id);

    const notifications = await db
      .collection("rb_audit")
      .find({
        $or: [
          { targetId: { $in: bookingIds } },
          { targetId: { $in: familyIds } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        _id: n._id.toString(),
        action: n.action,
        details: n.details || {},
        createdAt: n.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /notifications error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}