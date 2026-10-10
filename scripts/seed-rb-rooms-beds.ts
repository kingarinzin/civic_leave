// scripts/seed-rb-rooms-beds.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME || "civic_leave_db";
const now = new Date();

const roomsSeed = [
  {
    roomNumber: "PRO-201",
    roomName: "Executive Suite A",
    roomTypeCode: "EXECUTIVE",
    floor: 2, areaSqm: 45,
    description: "Premium executive suite with king bed, bathtub, and work desk.",
    amenities: ["WIFI", "AC", "HEATER", "HOT_WATER", "TV", "BATHTUB", "MINI_FRIDGE", "WORK_DESK", "WARDROBE"],
    wifiPassword: "acc-exec-201",
    emergencyContact: "17XXXXXX",
    beds: [{ label: "A", typeCode: "KING", rates: { tier1: 500, tier2: 800, tier3: 800, tier4: 1500, tier5: 2500 } }],
  },
  {
    roomNumber: "PRO-202",
    roomName: "Executive Suite B",
    roomTypeCode: "EXECUTIVE",
    floor: 2, areaSqm: 45,
    description: "Premium executive suite with king bed, bathtub, and balcony.",
    amenities: ["WIFI", "AC", "HEATER", "HOT_WATER", "TV", "BATHTUB", "BALCONY", "WORK_DESK", "WARDROBE"],
    wifiPassword: "acc-exec-202",
    emergencyContact: "17XXXXXX",
    beds: [{ label: "A", typeCode: "KING", rates: { tier1: 500, tier2: 800, tier3: 800, tier4: 1500, tier5: 2500 } }],
  },
  {
    roomNumber: "PRO-203",
    roomName: "Executive Suite C",
    roomTypeCode: "EXECUTIVE",
    floor: 2, areaSqm: 45,
    description: "Premium executive suite with king bed and study area.",
    amenities: ["WIFI", "AC", "HEATER", "HOT_WATER", "TV", "BATHTUB", "MINI_FRIDGE", "WORK_DESK", "WARDROBE"],
    wifiPassword: "acc-exec-203",
    emergencyContact: "17XXXXXX",
    beds: [{ label: "A", typeCode: "KING", rates: { tier1: 500, tier2: 800, tier3: 800, tier4: 1500, tier5: 2500 } }],
  },
  {
    roomNumber: "PRO-101",
    roomName: "Standard Room 101",
    roomTypeCode: "STANDARD",
    floor: 1, areaSqm: 22,
    description: "Standard room with two single beds.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-std-101",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
      { label: "B", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
    ],
  },
  {
    roomNumber: "PRO-102",
    roomName: "Standard Room 102",
    roomTypeCode: "STANDARD_DOUBLE",
    floor: 1, areaSqm: 24,
    description: "Standard room with one single bed and one double bed.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-std-102",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
      { label: "B", typeCode: "DOUBLE", rates: { tier1: 150, tier2: 300, tier3: 300, tier4: 700, tier5: 1200 } },
    ],
  },
  {
    roomNumber: "PRO-103",
    roomName: "Standard Room 103",
    roomTypeCode: "STANDARD",
    floor: 1, areaSqm: 22,
    description: "Standard room with two single beds.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-std-103",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
      { label: "B", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
    ],
  },
  {
    roomNumber: "PRO-104",
    roomName: "Standard Room 104",
    roomTypeCode: "STANDARD",
    floor: 1, areaSqm: 22,
    description: "Standard room with two single beds.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-std-104",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
      { label: "B", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
    ],
  },
  {
    roomNumber: "PRO-105",
    roomName: "Standard Room 105",
    roomTypeCode: "STANDARD_DOUBLE",
    floor: 1, areaSqm: 24,
    description: "Standard room with one single bed and one double bed.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-std-105",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
      { label: "B", typeCode: "DOUBLE", rates: { tier1: 150, tier2: 300, tier3: 300, tier4: 700, tier5: 1200 } },
    ],
  },
  {
    roomNumber: "PRO-R01",
    roomName: "Resident Room 1",
    roomTypeCode: "RESIDENT",
    floor: 1, areaSqm: 20,
    description: "Permanent resident room for long-stay staff.",
    amenities: ["WIFI", "AC", "HOT_WATER", "TV", "WARDROBE"],
    wifiPassword: "acc-res-01",
    emergencyContact: "17XXXXXX",
    beds: [
      { label: "A", typeCode: "SINGLE", rates: { tier1: 3000, tier2: 0, tier3: 0, tier4: 0, tier5: 0 } },
    ],
  },
];

async function seed() {
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  let roomCount = 0;
  let bedCount = 0;

  for (const r of roomsSeed) {
    const roomDoc = {
      roomNumber: r.roomNumber,
      roomName: r.roomName,
      roomTypeCode: r.roomTypeCode,
      floor: r.floor,
      areaSqm: r.areaSqm,
      description: r.description,
      amenities: r.amenities,
      photos: [],
      wifiPassword: r.wifiPassword,
      emergencyContact: r.emergencyContact,
      bedCount: r.beds.length,
      isResidentRoom: r.roomTypeCode === "RESIDENT",
      residentStaffId: null,
      status: "ACTIVE",
      qrCodeUrl: null,
      updatedAt: now,
    };

    const upsertRoom = await db.collection("rb_rooms").findOneAndUpdate(
      { roomNumber: r.roomNumber },
      { $set: roomDoc, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );

    const roomId = (upsertRoom?.value?._id || upsertRoom?._id) as ObjectId;
    roomCount++;

    for (const b of r.beds) {
      await db.collection("rb_beds").updateOne(
        { roomId, bedLabel: b.label },
        {
          $set: {
            roomId,
            roomNumber: r.roomNumber,
            bedLabel: b.label,
            bedTypeCode: b.typeCode,
            rates: b.rates,
            updatedAt: now,
          },
          $setOnInsert: {
            status: "AVAILABLE",
            currentBookingId: null,
            notes: null,
            createdAt: now,
          },
        },
        { upsert: true },
      );
      bedCount++;
    }
  }

  await db.collection("rb_rooms").createIndex({ roomNumber: 1 }, { unique: true });
  await db.collection("rb_beds").createIndex({ roomId: 1, bedLabel: 1 }, { unique: true });
  await db.collection("rb_beds").createIndex({ status: 1 });
  await db.collection("rb_bookings").createIndex({ bookingRef: 1 }, { unique: true });
  await db.collection("rb_family_registry").createIndex({ cid: 1 }, { unique: true });
  await db.collection("rb_ledger").createIndex({ staffId: 1, status: 1 });
  await db.collection("rb_audit").createIndex({ createdAt: -1 });

  await client.close();
  console.log(`🎉 Seeded ${roomCount} rooms and ${bedCount} beds.`);
  console.log("✅ Indexes created.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
