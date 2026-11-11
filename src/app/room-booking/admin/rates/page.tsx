"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Loader2, Save, DollarSign, Filter, RefreshCw, 
  ChevronLeft, ChevronRight, Search
} from "lucide-react";

interface RateRow {
  _id: string;
  roomId: string;
  roomNumber: string;
  bedLabel: string;
  bedTypeCode: string;
  roomTypeCode: string | null;
  rates: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
  };
}

const TIERS = [
  { key: "tier1", label: "T1 · Resident" },
  { key: "tier2", label: "T2 · ACC Staff" },
  { key: "tier3", label: "T3 · Family" },
  { key: "tier4", label: "T4 · Co-Agency" },
  { key: "tier5", label: "T5 · Stakeholder" },
] as const;

export default function AdminRatesPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rows, setRows] = useState<RateRow[]>([]);
  const [original, setOriginal] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/rates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRows(data.rates || []);
        setOriginal(JSON.parse(JSON.stringify(data.rates || [])));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRate = (bedId: string, tier: string, value: number) => {
    setRows((rs) =>
      rs.map((r) =>
        r._id === bedId
          ? { ...r, rates: { ...r.rates, [tier]: value } }
          : r,
      ),
    );
  };

  const hasChanges = JSON.stringify(rows) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = rows
        .filter((r, i) => JSON.stringify(r.rates) !== JSON.stringify(original[i].rates))
        .map((r) => ({ bedId: r._id, rates: r.rates }));

      if (updates.length === 0) {
        notify("No changes to save", "error");
        return;
      }

      const res = await fetch("/api/room-booking/rates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      const data = await res.json();
      notify(`Updated ${data.updated} beds`, "success");
      setOriginal(JSON.parse(JSON.stringify(rows)));
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter Logic
  const uniqueTypes = Array.from(new Set(rows.map(r => r.bedTypeCode).filter(Boolean)));

  const filteredRows = rows.filter((r) => {
    const matchesSearch = 
      r.roomNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.bedLabel?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "" || r.bedTypeCode === filterType;
    return matchesSearch && matchesType;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  const handleClearFilters = () => {
    setSearch("");
    setFilterType("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex w-full min-h-screen bg-gray-100 items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full min-h-screen bg-gray-100 overflow-x-hidden">
        {/* Fixed Sidebar (Assuming you use Sidebar, if not uncomment) */}
        {/* <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl hidden lg:block">
          <Sidebar />
        </div> */}

        <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6 overflow-hidden">
          <div className="max-w-[1600px] mx-auto w-full">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign size={24} className="text-blue-600" /> Room Rates
                </h1>
                <p className="text-sm text-gray-500 mt-1">Edit per-bed rates for all 5 tiers. Changes are saved in bulk.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>

            {/* Notification */}
            {notification && (
              <div
                className={`mb-4 px-4 py-2 rounded ${
                  notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {notification.message}
              </div>
            )}

            {/* Toolbar with Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                  <Filter size={16} className="text-gray-400" />
                  Filters:
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search Room or Bed..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>

                {/* Filter Type */}
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                {/* Clear Filters */}
                {(search || filterType) && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                  >
                    <RefreshCw size={14} /> Clear
                  </button>
                )}
              </div>

              {/* Records Counter */}
              <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
                <span>Show</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border rounded px-2 py-1 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="font-medium text-gray-800">{filteredRows.length} records</span>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white shadow rounded-lg overflow-x-auto w-full">
              <table className="min-w-[1000px] w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bed</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                    {TIERS.map((t) => (
                      <th key={t.key} className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.roomNumber}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.bedLabel}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.bedTypeCode}</td>
                        {TIERS.map((t) => {
                          // Highlight if changed from original
                          const isChanged = r.rates[t.key as keyof typeof r.rates] !== original.find(o => o._id === r._id)?.rates[t.key as keyof typeof r.rates];
                          return (
                            <td key={t.key} className="px-2 py-3">
                              <input
                                type="number"
                                value={r.rates[t.key as keyof typeof r.rates]}
                                onChange={(e) => updateRate(r._id, t.key, Number(e.target.value))}
                                className={`w-20 border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition ${
                                  isChanged ? "border-amber-400 bg-amber-50" : "border-gray-200"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
                <div>
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredRows.length)}</span> of <span className="font-semibold text-gray-800">{filteredRows.length}</span> records
                </div>
                <div className="flex items-center gap-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Unsaved Changes Warning */}
            {hasChanges && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800 text-sm font-medium">
                <span className="text-lg">⚠️</span> You have unsaved changes. Click <b>Save Changes</b> to apply.
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}