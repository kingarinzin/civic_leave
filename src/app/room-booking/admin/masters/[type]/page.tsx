"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MasterTable, { MasterItem } from "@/components/room-booking/MasterTable";

const TITLES: Record<string, string> = {
  "room-types": "Room Types",
  "bed-types": "Bed Types",
  amenities: "Amenities",
  "rate-tiers": "Rate Tiers",
  relationships: "Relationships",
  "proof-types": "Proof Types",
  "reservation-reasons": "Reservation Reasons",
  "waiver-reasons": "Waiver Reasons",
};

const COLUMNS: Record<string, { key: keyof MasterItem; label: string }[]> = {
  "room-types": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "description", label: "Description" }],
  "bed-types": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "description", label: "Description" }],
  amenities: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "category", label: "Category" }],
  "rate-tiers": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "description", label: "Description" }],
  relationships: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }],
  "proof-types": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }],
  "reservation-reasons": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }],
  "waiver-reasons": [{ key: "code", label: "Code" }, { key: "name", label: "Name" }],
};

export default function MasterTypePage() {
  const router = useRouter();
  const params = useParams();
  const type = params?.type as string;

  if (!TITLES[type]) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Invalid master type: {type}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push("/room-booking/admin/masters")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4">
          <ArrowLeft size={16} /> Back to Masters
        </button>
        <MasterTable type={type} title={TITLES[type]} columns={COLUMNS[type]} />
      </div>
    </div>
  );
}