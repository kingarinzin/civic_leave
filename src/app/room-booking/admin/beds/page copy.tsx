"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Filter } from "lucide-react";
import BedStatusBadge from "@/components/room-booking/BedStatusBadge";

interface Bed {
  _id: string;
  roomId: string;
  roomNumber: string;
  bedLabel: string;
  bedTypeCode: string;
  status: string;
  rates: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
  notes?: string | null;
}

export default function AdminBedsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/beds", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setBeds(data.beds || []);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = beds.filter((b) => {
    if (search && !b.roomNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && b.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: beds.length,
    available: beds.filter((b) => b.status === "AVAILABLE").length,
    occupied: beds.filter((b) => b.status === "OCCUPIED").length,
    reserved: beds.filter((b) => b.status === "RESERVED").length,
    maintenance: beds.filter((b) => b.status === "MAINTENANCE").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">All Beds</h1>
        <p className="text-sm text-gray-500 mb-6">Flat view of all beds across rooms</p>

        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg border p-3"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{counts.total}</p></div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3"><p className="text-xs text-green-700">Available</p><p className="text-xl font-bold text-green-700">{counts.available}</p></div>
          <div className="bg-gray-100 rounded-lg border p-3"><p className="text-xs text-gray-500">Occupied</p><p className="text-xl font-bold">{counts.occupied}</p></div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-3"><p className="text-xs text-amber-700">Reserved</p><p className="text-xl font-bold text-amber-700">{counts.reserved}</p></div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-3"><p className="text-xs text-red-700">Maintenance</p><p className="text-xl font-bold text-red-700">{counts.maintenance}</p></div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by room..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={28} /></div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Room</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Bed</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">T2 Rate</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{b.roomNumber}</td>
                    <td className="px-4 py-2">Bed {b.bedLabel}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{b.bedTypeCode}</td>
                    <td className="px-4 py-2"><BedStatusBadge status={b.status} size="sm" /></td>
                    <td className="px-4 py-2">Nu. {b.rates?.tier2 || 0}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{b.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}