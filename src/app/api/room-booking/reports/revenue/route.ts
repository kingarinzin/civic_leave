// src/app/api/room-booking/reports/revenue/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

/**
 * GET /api/room-booking/reports/revenue?from=&to=
 * Revenue by tier for a date range (default: last 90 days).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const bookings = await db
      .collection("rb_bookings")
      .find({
        createdAt: { $gte: from, $lte: to },
        bookingStatus: { $nin: ["CANCELLED"] },
      })
      .toArray();

    const byTier: Record<string, { count: number; total: number }> = {
      TIER1: { count: 0, total: 0 },
      TIER2: { count: 0, total: 0 },
      TIER3: { count: 0, total: 0 },
      TIER4: { count: 0, total: 0 },
      TIER5: { count: 0, total: 0 },
    };

    let grandTotal = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;
    let waivedTotal = 0;

    for (const b of bookings) {
      const tier = b.rateTier || "TIER2";
      if (!byTier[tier]) byTier[tier] = { count: 0, total: 0 };
      byTier[tier].count++;
      byTier[tier].total += Number(b.totalAmount || 0);
      grandTotal += Number(b.totalAmount || 0);

      if (b.paymentStatus === "PAID") paidTotal += Number(b.totalAmount || 0);
      else if (b.paymentStatus === "UNPAID") unpaidTotal += Number(b.totalAmount || 0);
      else if (b.paymentStatus === "WAIVED") waivedTotal += Number(b.totalAmount || 0);
    }

    // Daily revenue trend
    const daily: Record<string, number> = {};
    for (const b of bookings) {
      const d = new Date(b.createdAt).toISOString().slice(0, 10);
      daily[d] = (daily[d] || 0) + Number(b.totalAmount || 0);
    }

    const dailyArr = Object.entries(daily)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        bookings: bookings.length,
        grandTotal,
        paidTotal,
        unpaidTotal,
        waivedTotal,
      },
      byTier,
      daily: dailyArr,
    });
  } catch (error: any) {
    console.error("GET /reports/revenue error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}