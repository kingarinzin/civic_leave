// lib/rate-engine.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type OccupantType =
  | "RESIDENT_STAFF"
  | "ACC_STAFF"
  | "FAMILY"
  | "CO_AGENCY"
  | "STAKEHOLDER";

export type RateTier = "TIER1" | "TIER2" | "TIER3" | "TIER4" | "TIER5";

const OCCUPANT_TO_TIER: Record<OccupantType, RateTier> = {
  RESIDENT_STAFF: "TIER1",
  ACC_STAFF: "TIER2",
  FAMILY: "TIER3",
  CO_AGENCY: "TIER4",
  STAKEHOLDER: "TIER5",
};

const TIER_TO_KEY: Record<
  RateTier,
  "tier1" | "tier2" | "tier3" | "tier4" | "tier5"
> = {
  TIER1: "tier1",
  TIER2: "tier2",
  TIER3: "tier3",
  TIER4: "tier4",
  TIER5: "tier5",
};

export function getTierForOccupant(occupantType: OccupantType): RateTier {
  return OCCUPANT_TO_TIER[occupantType] || "TIER2";
}

export async function getRateForBed(
  bedId: string,
  occupantType: OccupantType,
): Promise<{ rate: number; tier: RateTier } | null> {
  const client = await clientPromise;
  const db = client.db("civic_leave_db");
  const bed = await db
    .collection("rb_beds")
    .findOne({ _id: new ObjectId(bedId) });
  if (!bed) return null;

  const tier = getTierForOccupant(occupantType);
  const key = TIER_TO_KEY[tier];
  const rate = Number(bed?.rates?.[key] ?? 0);

  return { rate, tier };
}

export function computeTotal(
  rate: number,
  nights: number,
  bedCount: number = 1,
): number {
  return rate * nights * bedCount;
}

export function computeNights(
  checkIn: Date | string,
  checkOut: Date | string,
): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(nights, 0);
}

export async function getBedRates(bedId: string) {
  const client = await clientPromise;
  const db = client.db("civic_leave_db");
  const bed = await db
    .collection("rb_beds")
    .findOne({ _id: new ObjectId(bedId) });
  return bed?.rates || null;
}