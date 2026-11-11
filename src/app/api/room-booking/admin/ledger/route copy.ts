import { NextResponse } from "next/server";
import clientPromise, { DATABASE_NAME } from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

export async function GET(req: Request) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME); // <-- USING THE EXPORTED NAME

    const query: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      query.status = statusFilter;
    }

    const ledgerItems = await db
      .collection("rb_ledger")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ ledger: ledgerItems }, { status: 200 });
  } catch (error) {
    console.error("Admin Ledger fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}