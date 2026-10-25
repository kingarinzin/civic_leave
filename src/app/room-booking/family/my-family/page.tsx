"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Users,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";

interface FamilyItem {
  _id: string;
  fullName: string;
  relationshipCode: string;
  cid: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  rejectedReason?: string;
  revokedReason?: string;
  createdAt: string;
}

const STATUS_ICON = {
  PENDING: <Clock size={14} className="text-amber-600" />,
  VERIFIED: <CheckCircle2 size={14} className="text-green-600" />,
  REJECTED: <XCircle size={14} className="text-red-600" />,
  REVOKED: <XCircle size={14} className="text-gray-600" />,
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  VERIFIED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  REVOKED: "bg-gray-200 text-gray-700 border-gray-300",
};

export default function MyFamilyPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<FamilyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER STATES ---
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // --- PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/family/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.items || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/room-booking/family/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Delete failed");
        return;
      }
      fetchItems();
    } catch {
      alert("Delete failed");
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  // --- FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.cid.toLowerCase().includes(search.toLowerCase()) ||
      item.relationshipCode.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = filterStatus === "" || item.status === filterStatus;

    return matchesSearch && matchesStatus;
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
              <Users className="text-gray-700" /> My Family Registry
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Register family members to book accommodation at the family rate.
            </p>
          </div>
          
          <button
            onClick={() => router.push("/room-booking/family/register")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} /> Register New
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
                placeholder="Search (Name, CID)..."
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
              onChange={handleStatusChange}
              className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
              <option value="REVOKED">Revoked</option>
            </select>

            {/* Clear Filters Button */}
            {(search || filterStatus) && (
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
              <Users className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No family members found matching your filters.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Full Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Relationship</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">CID Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.fullName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {item.relationshipCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600 whitespace-nowrap">
                      {item.cid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[item.status]}`}>
                        {STATUS_ICON[item.status]}
                        {item.status}
                      </span>
                      {item.status === "REJECTED" && item.rejectedReason && (
                        <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate">{item.rejectedReason}</p>
                      )}
                      {item.status === "REVOKED" && item.revokedReason && (
                        <p className="text-xs text-gray-600 mt-1 max-w-[200px] truncate">{item.revokedReason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {item.status !== "VERIFIED" ? (
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-md text-xs font-medium hover:bg-red-50 transition shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Verified</span>
                        )}
                      </div>
                    </td>
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