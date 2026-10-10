"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText, Search } from "lucide-react";

interface AuditEntry {
  _id: string;
  action: string;
  performedByStaffId: string;
  targetType: string;
  targetId: string | null;
  ipAddress: string;
  details: any;
  createdAt: string;
  performerSnapshot?: { name?: string; email?: string } | null;
}

export default function AuditLogPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/audit?limit=200", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setEntries(data.entries || []);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = entries.filter((e) => {
    if (actionFilter && e.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.action.toLowerCase().includes(s) ||
        e.targetType.toLowerCase().includes(s) ||
        (e.performerSnapshot?.name || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <ScrollText size={22} /> Audit Log
        </h1>
        <p className="text-sm text-gray-500 mb-6">All room booking actions</p>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action, target, or user..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">No audit entries.</div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">When</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Target</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">By</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">{e.action}</span>
                    </td>
                    <td className="px-4 py-2 text-xs">{e.targetType}</td>
                    <td className="px-4 py-2 text-xs">{e.performerSnapshot?.name || e.performedByStaffId}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">{e.ipAddress}</td>
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