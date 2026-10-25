"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  RefreshCw,
  Filter,
  Search
} from "lucide-react";

interface LedgerItem {
  _id: string;
  bookingRef?: string;
  reference?: string;
  bookingReference?: string;
  staffName?: string;
  description: string;
  amount: number;
  status: "UNPAID" | "PENDING_VERIFICATION" | "PAID";
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
}

export default function AdminLedgerPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // API Filter State
  const [filter, setFilter] = useState<
    "ALL" | "UNPAID" | "PENDING_VERIFICATION" | "PAID"
  >("PENDING_VERIFICATION");

  // Client-side Search & Filter States
  const [search, setSearch] = useState("");
  const [filterRef, setFilterRef] = useState("");

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room-booking/admin/ledger?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load ledger items");
      const data = await res.json();
      setItems(data.ledger || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleVerify = async (id: string, action: "APPROVE" | "REJECT") => {
    const confirmMsg = action === "APPROVE" 
      ? "Are you sure you want to mark this as PAID?" 
      : "Are you sure you want to reject this payment?";
      
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/room-booking/admin/ledger/${id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to verify payment");
        return;
      }
      
      load(); // Refresh list
    } catch (err) {
      alert("Failed to update payment status");
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterRefChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilterRef(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterRef("");
    setCurrentPage(1);
  };

  // --- CLIENT-SIDE FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    const displayRef = item.bookingRef || item.reference || item.bookingReference || "";
    const matchesSearch = 
      displayRef.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.paymentReference || "").toLowerCase().includes(search.toLowerCase());
      
    const matchesRef = filterRef === "" || displayRef.toLowerCase().includes(filterRef.toLowerCase());

    return matchesSearch && matchesRef;
  });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-gray-700" /> Payment Verification
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Verify mBop Journey Numbers and clear user bills.
            </p>
          </div>
          <button 
            onClick={load} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* TOOLBAR WITH SEARCH & FILTERS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search (Booking Ref, Journey No)..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
              <Filter size={16} className="text-gray-400" />
              Filters:
            </div>

            {/* Booking Ref Filter */}
            <input
              type="text"
              value={filterRef}
              onChange={handleFilterRefChange}
              placeholder="Filter by Booking Ref..."
              className="w-40 px-2 py-1.5 text-sm border rounded outline-none bg-gray-50 hover:bg-white transition"
            />

            {/* Status Filter (API Driven) */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
            >
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="ALL">All Statuses</option>
            </select>

            {/* Clear Filters Button */}
            {(search || filterRef) && (
              <button 
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                title="Clear all filters"
              >
                <RefreshCw size={14} /> Clear
              </button>
            )}
          </div>

          {/* RECORDS COUNTER & ROWS PER PAGE */}
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
            <span className="font-medium text-gray-800">{filteredItems.length} records</span>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <FileText className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No bills found matching your filters.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Booking Ref</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">mBop Journey No.</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedItems.map((item) => {
                  const displayRef = item.bookingRef || item.reference || item.bookingReference || "N/A";

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {displayRef}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                        Nu. {item.amount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-blue-600 whitespace-nowrap">
                        {item.paymentReference || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : item.status === "PENDING_VERIFICATION"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {item.status === "PENDING_VERIFICATION" && (
                            <>
                              <button
                                onClick={() => handleVerify(item._id, "APPROVE")}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition shadow-sm"
                              >
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleVerify(item._id, "REJECT")}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition shadow-sm"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}

                          {item.status === "UNPAID" && (
                            <button
                              onClick={() => handleVerify(item._id, "APPROVE")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition shadow-sm"
                            >
                              <CheckCircle2 size={14} /> Mark as Paid
                            </button>
                          )}

                          {item.status === "PAID" && (
                            <span className="text-xs text-gray-400 font-medium">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredItems.length)}</span> of <span className="font-semibold text-gray-800">{filteredItems.length}</span> records
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