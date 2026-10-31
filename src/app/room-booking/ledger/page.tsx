"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft, 
  Wallet, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Search,
  Filter,
  Home
} from "lucide-react";

interface LedgerItem {
  _id: string;
  bookingRef: string;
  description: string;
  amount: number;
  status: "UNPAID" | "PENDING_VERIFICATION" | "PAID";
  createdAt: string;
}

export default function MyLedgerPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment Modal State
  const [selectedBill, setSelectedBill] = useState<LedgerItem | null>(null);
  const [journeyNo, setJourneyNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const dashboardUrl = isAdmin ? "/admin/pending-users" : "/dashboard/leave";

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/ledger", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load pending bills");
      const data = await res.json();
      setLedger(data.ledger || []);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [token]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !journeyNo) return alert("Please enter the Journey Number");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/room-booking/ledger/${selectedBill._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "MBOB",
          referenceNumber: journeyNo,
        }),
      });

      if (!res.ok) throw new Error("Payment submission failed");

      alert("Payment submitted successfully! Waiting for Admin verification.");
      setSelectedBill(null);
      setJourneyNo("");
      loadLedger(); // Refresh the list to show the new status
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Filtering Logic
  const filteredLedger = ledger.filter((item) => {
    const searchStr = search.toLowerCase();
    const matchesSearch = 
      (item.bookingRef || "").toLowerCase().includes(searchStr) ||
      (item.description || "").toLowerCase().includes(searchStr);
      
    const matchesStatus = filterStatus === "" || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLedger.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLedger = filteredLedger.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans relative">
      <div className="max-w-[1600px] mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(dashboardUrl)}
              className="p-2.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition shadow-sm"
              title="Back to Dashboard"
            >
              <Home size={20} className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="text-gray-700" /> Pending Bills & Ledger
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                You must settle pending bills via mBop before booking a new room.
              </p>
            </div>
          </div>
          
          <button 
            onClick={loadLedger} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
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
                placeholder="Search Booking Ref..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
              <Filter size={16} className="text-gray-400" />
              Filters:
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
            >
              <option value="">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          {/* Rows per page */}
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
            <span className="font-medium text-gray-800">{filteredLedger.length} records</span>
          </div>
        </div>

        {/* CONTENT */}
        {loading && ledger.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
            {error}
          </div>
        ) : filteredLedger.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-500 mb-3" size={48} />
            <h3 className="text-lg font-medium text-gray-900">No Bills Found</h3>
            <p className="text-gray-500 mt-1">No bills match your search criteria.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Booking Ref</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedLedger.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{item.bookingRef}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{item.description || "-"}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                      Nu. {item.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === "PAID" ? "bg-green-100 text-green-700" : 
                        item.status === "PENDING_VERIFICATION" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {item.status === "UNPAID" && (
                        <button
                          onClick={() => setSelectedBill(item)}
                          className="px-3 py-1.5 bg-black text-white rounded-md text-xs font-bold hover:bg-gray-800 transition shadow-sm"
                        >
                          Pay Now
                        </button>
                      )}
                      {item.status === "PAID" && (
                        <span className="text-xs text-gray-400 font-medium">Settled</span>
                      )}
                      {item.status === "PENDING_VERIFICATION" && (
                        <span className="text-xs text-amber-600 font-medium">Verifying...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredLedger.length)}</span> of <span className="font-semibold text-gray-800">{filteredLedger.length}</span> records
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

      {/* PAYMENT MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setSelectedBill(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pay Bill via mBop</h2>
            <p className="text-sm text-gray-500 mb-6">
              Amount to pay: <strong className="text-black">Nu. {selectedBill.amount}</strong>
            </p>

            <div className="flex flex-col items-center mb-6">
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                 {/* REPLACE THIS WITH YOUR ACTUAL QR IMAGE */}
                 <span className="text-gray-400 text-sm text-center px-4">Bank QR Code<br/>Goes Here</span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Scan this QR in your mBop app and transfer exactly Nu. {selectedBill.amount}
              </p>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  mBop Journey Number
                </label>
                <input
                  type="text"
                  required
                  value={journeyNo}
                  onChange={(e) => setJourneyNo(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex justify-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Journey Number"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}