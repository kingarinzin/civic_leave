"use client";

import { useRouter } from "next/navigation";
import { Home, BedDouble, Sparkles, DollarSign, Users, FileText, Lock, Gift } from "lucide-react";

const MASTERS = [
  { type: "room-types", title: "Room Types", icon: Home, color: "bg-blue-50 text-blue-700" },
  { type: "bed-types", title: "Bed Types", icon: BedDouble, color: "bg-indigo-50 text-indigo-700" },
  { type: "amenities", title: "Amenities", icon: Sparkles, color: "bg-purple-50 text-purple-700" },
  { type: "rate-tiers", title: "Rate Tiers", icon: DollarSign, color: "bg-emerald-50 text-emerald-700" },
  { type: "relationships", title: "Relationships", icon: Users, color: "bg-pink-50 text-pink-700" },
  { type: "proof-types", title: "Proof Types", icon: FileText, color: "bg-amber-50 text-amber-700" },
  { type: "reservation-reasons", title: "Reservation Reasons", icon: Lock, color: "bg-rose-50 text-rose-700" },
  { type: "waiver-reasons", title: "Waiver Reasons", icon: Gift, color: "bg-teal-50 text-teal-700" },
];

export default function MastersPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Masters</h1>
        <p className="text-sm text-gray-500 mb-6">Manage all master data — no code changes needed</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MASTERS.map((m) => (
            <button
              key={m.type}
              onClick={() => router.push(`/room-booking/admin/masters/${m.type}`)}
              className="bg-white rounded-xl border p-4 text-left hover:shadow-md transition"
            >
              <div className={`p-2 rounded-lg ${m.color} w-fit mb-3`}>
                <m.icon size={18} />
              </div>
              <p className="font-semibold text-sm">{m.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}