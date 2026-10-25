"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, BedDouble, Sparkles, DollarSign, Users, FileText, Lock, Gift, 
  ChevronRight, Loader2, Search, Settings
} from "lucide-react";
import MasterTable, { MasterItem } from "@/components/room-booking/MasterTable";

const MASTERS = [
  { type: "room-types", title: "Room Types", icon: Home },
  { type: "bed-types", title: "Bed Types", icon: BedDouble },
  { type: "amenities", title: "Amenities", icon: Sparkles },
  { type: "rate-tiers", title: "Rate Tiers", icon: DollarSign },
  { type: "relationships", title: "Relationships", icon: Users },
  { type: "proof-types", title: "Proof Types", icon: FileText },
  { type: "reservation-reasons", title: "Reservation Reasons", icon: Lock },
  { type: "waiver-reasons", title: "Waiver Reasons", icon: Gift },
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
  const [activeType, setActiveType] = useState<string>("room-types");
  const [search, setSearch] = useState("");

  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const dashboardUrl = isAdmin ? "/admin/pending-users" : "/dashboard/leave";

  const activeMaster = MASTERS.find((m) => m.type === activeType);

  const filteredMasters = MASTERS.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      {/* TOP HEADER (ACC-RAA Style) */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(dashboardUrl)}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <Home size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Masters</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all master data configurations.</p>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          />
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto overflow-hidden">
        
        {/* LEFT SIDEBAR MENU */}
        <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categories</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredMasters.map((m) => {
              const isActive = activeType === m.type;
              return (
                <button
                  key={m.type}
                  onClick={() => setActiveType(m.type)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <m.icon size={18} className={isActive ? "text-blue-600" : "text-gray-400"} />
                    {m.title}
                  </div>
                  {isActive && <ChevronRight size={16} className="text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-6">
          {activeMaster && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* CONTENT HEADER */}
              <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                  <activeMaster.icon size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{activeMaster.title}</h2>
                  <p className="text-xs text-gray-500">Manage the list of {activeMaster.title.toLowerCase()} used in the system.</p>
                </div>
              </div>

              {/* THE MASTER TABLE COMPONENT */}
              <MasterTable 
                type={activeType} 
                title={activeMaster.title} 
                columns={COLUMNS[activeType]} 
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function MastersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <MastersPageInner />
    </Suspense>
  );
}