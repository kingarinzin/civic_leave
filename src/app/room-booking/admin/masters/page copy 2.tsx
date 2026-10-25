"use client";

import { useState } from "react";
import { 
  Home, BedDouble, Sparkles, DollarSign, Users, FileText, Lock, Gift, 
  ChevronDown, Loader2 
} from "lucide-react";

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
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = (type: string) => {
    if (activeType === type) {
      setActiveType(null);
    } else {
      setLoading(true);
      setActiveType(type);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Masters</h1>
        <p className="text-sm text-gray-500 mb-6">Manage all master data — no code changes needed</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MASTERS.map((m) => {
            const isActive = activeType === m.type;
            return (
              <button
                key={m.type}
                onClick={() => handleToggle(m.type)}
                className={`bg-white rounded-xl border p-4 text-left transition-all ${
                  isActive ? "ring-2 ring-blue-500 shadow-md border-transparent" : "hover:shadow-md border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${m.color}`}>
                    <m.icon size={18} />
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`text-gray-400 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} 
                  />
                </div>
                <p className="font-semibold text-sm text-gray-800">{m.title}</p>
              </button>
            );
          })}
        </div>

        {/* INLINE EXPANDABLE IFRAME PANEL */}
        {activeType && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                {MASTERS.find(m => m.type === activeType)?.title} Manager
              </h2>
              <button 
                onClick={() => setActiveType(null)}
                className="text-xs text-red-500 font-medium hover:underline"
              >
                Close Panel
              </button>
            </div>
            
            <div className="relative w-full h-[600px]">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              )}
              <iframe
                src={`/room-booking/admin/masters/${activeType}`}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
                title={`${activeType} Master`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}