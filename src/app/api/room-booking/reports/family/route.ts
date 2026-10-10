// src/app/api/room-booking/reports/family/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

/**
 * GET /api/room-booking/reports/family
 * Family verification statistics.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const statuses = ["PENDING", "VERIFIED", "REJECTED", "REVOKED"];
    const stats: Record<string, number> = {};

    for (const s of statuses) {
      stats[s] = await db.collection("rb_family_registry").countDocuments({ status: s });
    }

    const total = await db.collection("rb_family_registry").countDocuments({});

    // By relationship
    const byRelationship: Record<string, number> = {};
    const rels = await db
      .collection("rb_family_registry")
      .aggregate([
        { $match: { status: "VERIFIED" } },
        { $group: { _id: "$relationshipCode", count: { $sum: 1 } } },
      ])
      .toArray();

    for (const r of rels) {
      byRelationship[r._id] = r.count;
    }

    return NextResponse.json({
      total,
      byStatus: stats,
      verifiedByRelationship: byRelationship,
    });
  } catch (error: any) {
    console.error("GET /reports/family error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}