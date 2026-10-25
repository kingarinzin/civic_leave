"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { Loader2, Search, Filter, RefreshCw, BedDouble } from "lucide-react";
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
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/beds", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBeds(data.beds || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  // Filtering Logic
  const filtered = beds.filter((b) => {
    if (search && !b.roomNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && b.status !== statusFilter) return false;
    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedBeds = filtered.slice(startIndex, startIndex + rowsPerPage);

  const counts = {
    total: beds.length,
    available: beds.filter((b) => b.status === "AVAILABLE").length,
    occupied: beds.filter((b) => b.status === "OCCUPIED").length,
    reserved: beds.filter((b) => b.status === "RESERVED").length,
    maintenance: beds.filter((b) => b.status === "MAINTENANCE").length,
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BedDouble className="text-gray-700" /> All Beds
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Flat view of all beds across all rooms in the system.
            </p>
          </div>
          <button 
            onClick={load} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{counts.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Available</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{counts.available}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{counts.occupied}</p>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Reserved</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{counts.reserved}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 shadow-sm">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Maintenance</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{counts.maintenance}</p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by room..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
              <Filter size={16} className="text-gray-400" />
              Filters:
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            {/* Clear Filters */}
            {(search || statusFilter) && (
              <button 
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
              >
                <RefreshCw size={14} /> Clear
              </button>
            )}
          </div>

          {/* Rows per page & Counter */}
          <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
            <span>Show</span>
            <select 
              value={rowsPerPage} 
              onChange={handleRowsChange} 
              className="border rounded px-2 py-1 outline-none bg-gray-50 hover:bg-white transition"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span className="font-medium text-gray-800">{filtered.length} records</span>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <BedDouble className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No beds found matching your filters.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Room</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Bed</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">T2 Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedBeds.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{b.roomNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">Bed {b.bedLabel}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{b.bedTypeCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><BedStatusBadge status={b.status} size="sm" /></td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">Nu. {b.rates?.tier2 || 0}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{b.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filtered.length)}</span> of <span className="font-semibold text-gray-800">{filtered.length}</span> records
            </div>
            <div className="flex items-center gap-4">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
              >
                &lt;
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}