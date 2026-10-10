"use client";

import { useEffect, useState } from "react";
import { Loader2, BarChart3, TrendingUp, Download } from "lucide-react";

interface OccupancyData {
  totals: {
    totalBeds: number;
    totalRooms: number;
    currentlyOccupied: number;
    currentlyReserved: number;
    currentlyAvailable: number;
  };
  daily: { date: string; occupied: number; available: number; occupancyRate: number }[];
}

interface RevenueData {
  totals: {
    bookings: number;
    grandTotal: number;
    paidTotal: number;
    unpaidTotal: number;
    waivedTotal: number;
  };
  byTier: Record<string, { count: number; total: number }>;
}

export default function ReportsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tab, setTab] = useState<"occupancy" | "revenue">("occupancy");
  const [loading, setLoading] = useState(true);
  const [occ, setOcc] = useState<OccupancyData | null>(null);
  const [rev, setRev] = useState<RevenueData | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [occRes, revRes] = await Promise.all([
          fetch("/api/room-booking/reports/occupancy", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/room-booking/reports/revenue", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setOcc(await occRes.json());
        setRev(await revRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadExport = async (type: string) => {
    const res = await fetch(`/api/room-booking/reports/export?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const maxDaily = Math.max(1, ...(occ?.daily.map((d) => d.occupied) || [0]));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <BarChart3 size={22} /> Reports
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Occupancy, revenue, and export reports.
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("occupancy")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === "occupancy" ? "bg-black text-white" : "bg-white border"
            }`}
          >
            Occupancy
          </button>
          <button
            onClick={() => setTab("revenue")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === "revenue" ? "bg-black text-white" : "bg-white border"
            }`}
          >
            Revenue
          </button>
        </div>

        {tab === "occupancy" && occ && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Total Beds</p>
                <p className="text-2xl font-bold mt-1">{occ.totals.totalBeds}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Occupied</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{occ.totals.currentlyOccupied}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Reserved</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{occ.totals.currentlyReserved}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{occ.totals.currentlyAvailable}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-sm font-semibold mb-4">
                Daily Occupancy (Last 30 Days)
              </h2>
              <div className="flex items-end gap-1 h-48">
                {occ.daily.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-blue-500 rounded-t"
                    style={{ height: `${(d.occupied / maxDaily) * 100}%` }}
                    title={`${d.date}: ${d.occupied} occupied (${d.occupancyRate}%)`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{occ.daily[0]?.date}</span>
                <span>{occ.daily[occ.daily.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}

        {tab === "revenue" && rev && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Total Bookings</p>
                <p className="text-2xl font-bold mt-1">{rev.totals.bookings}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">Nu. {rev.totals.paidTotal}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Unpaid</p>
                <p className="text-2xl font-bold text-red-600 mt-1">Nu. {rev.totals.unpaidTotal}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase">Waived</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">Nu. {rev.totals.waivedTotal}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> Revenue by Tier
              </h2>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs uppercase text-gray-600">Tier</th>
                    <th className="px-4 py-2 text-left text-xs uppercase text-gray-600">Bookings</th>
                    <th className="px-4 py-2 text-left text-xs uppercase text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(rev.byTier).map(([tier, d]) => (
                    <tr key={tier}>
                      <td className="px-4 py-2 font-medium">{tier}</td>
                      <td className="px-4 py-2">{d.count}</td>
                      <td className="px-4 py-2">Nu. {d.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => downloadExport("bookings")}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-md text-sm"
          >
            <Download size={14} /> Export Bookings CSV
          </button>
          <button
            onClick={() => downloadExport("ledger")}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-md text-sm"
          >
            <Download size={14} /> Export Ledger CSV
          </button>
        </div>
      </div>
    </div>
  );
}