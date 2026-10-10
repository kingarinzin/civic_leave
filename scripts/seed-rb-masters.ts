// scripts/seed-rb-masters.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME || "civic_leave_db";
const now = new Date();

const masters = {
  rb_room_types: [
    { code: "STANDARD", name: "Standard Room", description: "Standard double-occupancy room", defaultBedCount: 2, sortOrder: 1 },
    { code: "STANDARD_DOUBLE", name: "Standard Double", description: "Standard room with single + double bed", defaultBedCount: 2, sortOrder: 2 },
    { code: "EXECUTIVE", name: "Executive Room", description: "Premium executive room with king bed", defaultBedCount: 1, sortOrder: 3 },
    { code: "VIP", name: "VIP Suite", description: "VIP suite for dignitaries", defaultBedCount: 1, sortOrder: 4 },
    { code: "RESIDENT", name: "Resident Room", description: "Permanent resident staff room", defaultBedCount: 1, sortOrder: 5 },
    { code: "DORM", name: "Dormitory", description: "Shared dormitory with bunk beds", defaultBedCount: 4, sortOrder: 6 },
  ],
  rb_bed_types: [
    { code: "SINGLE", name: "Single Bed", description: "Single occupancy", sortOrder: 1 },
    { code: "DOUBLE", name: "Double Bed", description: "Double bed (1–2 related occupants)", sortOrder: 2 },
    { code: "KING", name: "King Bed", description: "King-size bed for executive rooms", sortOrder: 3 },
    { code: "BUNK", name: "Bunk Bed", description: "Bunk bed (2 stacked)", sortOrder: 4 },
  ],
  rb_amenities: [
    { code: "WIFI", name: "WiFi", icon: "wifi", category: "CONNECTIVITY", sortOrder: 1 },
    { code: "AC", name: "Air Conditioning", icon: "snowflake", category: "COMFORT", sortOrder: 2 },
    { code: "HEATER", name: "Room Heater", icon: "flame", category: "COMFORT", sortOrder: 3 },
    { code: "HOT_WATER", name: "Hot Water", icon: "droplet", category: "BATHROOM", sortOrder: 4 },
    { code: "TV", name: "Smart TV", icon: "tv", category: "ENTERTAINMENT", sortOrder: 5 },
    { code: "BATHTUB", name: "Bathtub", icon: "bath", category: "BATHROOM", sortOrder: 6 },
    { code: "MINI_FRIDGE", name: "Mini Fridge", icon: "refrigerator", category: "COMFORT", sortOrder: 7 },
    { code: "BALCONY", name: "Balcony", icon: "door-open", category: "COMFORT", sortOrder: 8 },
    { code: "WORK_DESK", name: "Work Desk", icon: "briefcase", category: "WORK", sortOrder: 9 },
    { code: "WARDROBE", name: "Wardrobe", icon: "shirt", category: "COMFORT", sortOrder: 10 },
  ],
  rb_rate_tiers: [
    { code: "TIER1", name: "Resident Staff", description: "Permanent staff residing at PRO", sortOrder: 1 },
    { code: "TIER2", name: "ACC Staff", description: "ACC officers on duty", sortOrder: 2 },
    { code: "TIER3", name: "Family (Verified)", description: "Verified family members of ACC staff", sortOrder: 3 },
    { code: "TIER4", name: "Co-Agency Officer", description: "Officers from co-related agencies", sortOrder: 4 },
    { code: "TIER5", name: "Stakeholder", description: "External stakeholders (APIC approval required)", sortOrder: 5 },
  ],
  rb_relationships: [
    { code: "SPOUSE", name: "Spouse", requiresProof: true, sortOrder: 1 },
    { code: "PARENT", name: "Parent", requiresProof: true, sortOrder: 2 },
    { code: "CHILD", name: "Child", requiresProof: true, sortOrder: 3 },
    { code: "SIBLING", name: "Sibling", requiresProof: true, sortOrder: 4 },
    { code: "INLAW_FATHER", name: "Father-in-law", requiresProof: true, sortOrder: 5 },
    { code: "INLAW_MOTHER", name: "Mother-in-law", requiresProof: true, sortOrder: 6 },
    { code: "DEPENDENT", name: "Dependent", requiresProof: true, sortOrder: 7 },
    { code: "OTHER", name: "Other", requiresProof: true, sortOrder: 8 },
  ],
  rb_proof_types: [
    { code: "MARRIAGE_CERT", name: "Marriage Certificate", sortOrder: 1 },
    { code: "CID_COPY", name: "CID Copy", sortOrder: 2 },
    { code: "BIRTH_CERT", name: "Birth Certificate", sortOrder: 3 },
    { code: "FAMILY_TREE", name: "Family Tree (Gewog)", sortOrder: 4 },
    { code: "COURT_ORDER", name: "Court Order (Guardian)", sortOrder: 5 },
    { code: "OTHER", name: "Other Document", sortOrder: 6 },
  ],
  rb_reservation_reasons: [
    { code: "APIC", name: "APIC Visit", sortOrder: 1 },
    { code: "EXECUTIVE", name: "Executive Visit", sortOrder: 2 },
    { code: "VIP", name: "VIP Guest", sortOrder: 3 },
    { code: "CASE", name: "Sensitive Case Work", sortOrder: 4 },
    { code: "MAINTENANCE", name: "Maintenance", sortOrder: 5 },
  ],
  rb_waiver_reasons: [
    { code: "OFFICIAL_DUTY", name: "Official Duty", sortOrder: 1 },
    { code: "VIP", name: "VIP Guest", sortOrder: 2 },
    { code: "CASE", name: "Case-Related", sortOrder: 3 },
    { code: "EMERGENCY", name: "Emergency", sortOrder: 4 },
    { code: "OTHER", name: "Other (with justification)", sortOrder: 5 },
  ],
};

async function seed() {
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  for (const [collection, docs] of Object.entries(masters)) {
    const col = db.collection(collection);
    for (const doc of docs) {
      await col.updateOne(
        { code: doc.code },
        {
          $setOnInsert: { ...doc, isActive: true, createdAt: now },
          $set: { updatedAt: now },
        },
        { upsert: true },
      );
    }
    console.log(`✅ Seeded ${collection}: ${docs.length} entries`);
  }

  await client.close();
  console.log("🎉 Master seeding complete.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
