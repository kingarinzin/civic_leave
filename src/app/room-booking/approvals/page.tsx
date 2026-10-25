"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { 
  Loader2, 
  Check, 
  X, 
  UserCheck, 
  Search, 
  Filter, 
  RefreshCw 
} from "lucide-react";

interface Approval {
  _id: string;
  bookingId: string;
  status: string;
  createdAt: string;
  requestedBySnapshot: { name?: string; email?: string; role?: string } | null;
  bookingSnapshot: {
    bookingRef: string;
    occupantName: string;
    occupantAgency: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    roomNumber: string;
  } | null;
}

export default function ApprovalsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room-booking/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.approvals || []);
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
  }, [filter]);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    const remarks = prompt(
      action === "REJECT" ? "Reason for rejection?" : "Remarks (optional):",
    );
    if (action === "REJECT" && !remarks) return;

    setProcessing(id);
    try {
      const res = await fetch(`/api/room-booking/approvals/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Action failed");
        return;
      }
      load();
    } catch {
      alert("Action failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const searchStr = search.toLowerCase();
    return (
      (item.bookingSnapshot?.bookingRef || "").toLowerCase().includes(searchStr) ||
      (item.requestedBySnapshot?.name || "").toLowerCase().includes(searchStr) ||
      (item.bookingSnapshot?.occupantName || "").toLowerCase().includes(searchStr) ||
      (item.bookingSnapshot?.occupantAgency || "").toLowerCase().includes(searchStr)
    );
  });

  // Pagination
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
              <UserCheck className="text-gray-700" /> Commission or Secretariat Approval
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Approve or reject stakeholder bookings (Tier 5).
            </p>
          </div>
          <button 
            onClick={load} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
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
                placeholder="Search (Ref, Requestor, Stakeholder)..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
              <Filter size={16} className="text-gray-400" />
              Status:
            </div>

            {/* Status Filter (API Driven) */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(["PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filter === f 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
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
              <UserCheck className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No {filter.toLowerCase()} approvals found.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Date Requested</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Booking Ref</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Requested By</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Stakeholder Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Room & Dates</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Total</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedItems.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {a.bookingSnapshot?.bookingRef}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      <p className="font-semibold">{a.requestedBySnapshot?.name}</p>
                      <p className="text-xs text-gray-500">{a.requestedBySnapshot?.role}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      <p className="font-semibold">{a.bookingSnapshot?.occupantName}</p>
                      <p className="text-xs text-gray-500">{a.bookingSnapshot?.occupantAgency}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      <p className="font-semibold text-blue-600">Room {a.bookingSnapshot?.roomNumber}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(a.bookingSnapshot?.checkIn || "").toLocaleDateString()} - {new Date(a.bookingSnapshot?.checkOut || "").toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                      Nu. {a.bookingSnapshot?.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {a.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAction(a._id, "APPROVE")}
                            disabled={processing === a._id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition shadow-sm"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(a._id, "REJECT")}
                            disabled={processing === a._id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition shadow-sm"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {a.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION FOOTER */}
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