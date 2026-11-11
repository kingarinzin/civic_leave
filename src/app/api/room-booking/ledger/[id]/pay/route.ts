// src/app/api/room-booking/ledger/[id]/pay/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingUser } from "@/lib/room-booking-auth";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyBookingUser(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    
    const formData = await req.formData();
    const method = formData.get("method") as string;
    const referenceNumber = formData.get("referenceNumber") as string;
    const files = formData.getAll("attachments") as File[];

    if (!method || !referenceNumber) {
      return NextResponse.json({ error: "Payment method and reference number are required" }, { status: 400 });
    }

    const savedFilenames: string[] = [];
    
    if (files && files.length > 0) {
      // 🚨 CHANGED: Save directly into the public folder
      const uploadDir = path.join(process.cwd(), "public/uploads/room-booking/money-receipt");
      
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create directory:", err);
        throw new Error("Could not create upload directory on server.");
      }

      for (const file of files) {
        if (file.size === 0) continue;
        
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
        const filename = `${uniqueSuffix}-${originalName}`;
        
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadDir, filename), buffer);
        
        savedFilenames.push(filename);
      }
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const ledgerResult = await db.collection("rb_ledger").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "PENDING_VERIFICATION",
          paymentMethod: method,
          paymentReference: referenceNumber,
          paymentDate: new Date(),
          receipts: savedFilenames,
        },
      }
    );

    if (ledgerResult.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const ledgerEntry = await db.collection("rb_ledger").findOne({ _id: new ObjectId(id) });
    
    if (ledgerEntry && ledgerEntry.bookingId) {
      await db.collection("rb_bookings").updateOne(
        { _id: new ObjectId(ledgerEntry.bookingId) },
        { $set: { paymentStatus: "PENDING_VERIFICATION" } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PAY ERROR:", error);
    return NextResponse.json({ error: (error as Error).message || "Server error" }, { status: 500 });
  }
}