"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, BedDouble, Sparkles, DollarSign, Users, FileText, Lock, Gift, 
  ChevronDown, Loader2 
} from "lucide-react";
import MasterTable, { MasterItem } from "@/components/room-booking/MasterTable";

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

function MastersPageInner() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<string | null>(null);

  // Dynamic routing based on user role
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const dashboardUrl = isAdmin ? "/admin/pending-users" : "/dashboard/leave";

  const handleToggle = (type: string) => {
    if (activeType === type) {
      setActiveType(null);
    } else {
      setActiveType(type);
    }
  };

  const activeMaster = MASTERS.find((m) => m.type === activeType);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER WITH HOME BUTTON */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.push(dashboardUrl)}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 transition shadow-sm"
            title="Back to Dashboard"
          >
            <Home size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Masters</h1>
            <p className="text-sm text-gray-500">Manage all master data — no code changes needed</p>
          </div>
        </div>

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

        {/* INLINE PANEL (Direct Component Render) */}
        {activeType && activeMaster && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <activeMaster.icon size={18} className="text-blue-600" />
                {activeMaster.title} Manager
              </h2>
              <button 
                onClick={() => setActiveType(null)}
                className="text-xs text-red-500 font-medium hover:underline"
              >
                Close Panel
              </button>
            </div>
            
            <div className="p-4">
              <MasterTable 
                type={activeType} 
                title={activeMaster.title} 
                columns={COLUMNS[activeType]} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MastersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    }>
      <MastersPageInner />
    </Suspense>
  );
}