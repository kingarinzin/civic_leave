"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw 
} from "lucide-react";

export default function AdminApproversPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "APPROVER", "ADMIN", or ""
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/admin/approvers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApprovers(data.approvers || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleToggleApprover = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/room-booking/admin/approvers/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      load();
    } catch (err) {
      alert("Error updating approver");
    }
  };

  const handleToggleRoomAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm("Are you sure you want to change Room Admin access for this user?")) return;
    
    try {
      const res = await fetch("/api/room-booking/admin/approvers/toggle-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      load();
    } catch (err) {
      alert("Error updating room admin");
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleRowsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Filtering Logic
  const filteredApprovers = approvers.filter((user) => {
    const searchStr = search.toLowerCase();
    const matchesSearch = 
      (user.name || "").toLowerCase().includes(searchStr) ||
      (user.email || "").toLowerCase().includes(searchStr) ||
      (user.role || "").toLowerCase().includes(searchStr);

    const matchesStatus = 
      filterStatus === "" || 
      (filterStatus === "APPROVER" && user.isRoomBookingApprover) ||
      (filterStatus === "ADMIN" && user.isRoomBookingAdmin);

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredApprovers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedApprovers = filteredApprovers.slice(startIndex, startIndex + rowsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="text-gray-700" /> Approval Authority & Admins
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Assign the active approver for Tier 4 & 5 room bookings, and manage Room Admin access.
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
                placeholder="Search by name, email, role..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
              <Filter size={16} className="text-gray-400" />
              Filters:
            </div>

            {/* Status Filters */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleFilterChange("")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filterStatus === "" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All Staff
              </button>
              <button
                onClick={() => handleFilterChange("APPROVER")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filterStatus === "APPROVER" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Approvers
              </button>
              <button
                onClick={() => handleFilterChange("ADMIN")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filterStatus === "ADMIN" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Room Admins
              </button>
            </div>
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
            <span className="font-medium text-gray-800">{filteredApprovers.length} records</span>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {filteredApprovers.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <UserCheck className="mx-auto mb-3 text-gray-300" size={48} />
              <p>No users found matching your search.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Role</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Approver</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Room Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedApprovers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">
                        {user.role || "Officer"}
                      </span>
                    </td>
                    
                    {/* APPROVER TOGGLE */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleApprover(user._id, user.isRoomBookingApprover)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm border ${
                          user.isRoomBookingApprover
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {user.isRoomBookingApprover ? "Active Approver" : "Make Approver"}
                      </button>
                    </td>

                    {/* ROOM ADMIN TOGGLE */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRoomAdmin(user._id, user.isRoomBookingAdmin)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto ${
                          user.isRoomBookingAdmin
                            ? "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700"
                            : "bg-white border border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        <ShieldCheck size={14} /> 
                        {user.isRoomBookingAdmin ? "Room Admin" : "Make Admin"}
                      </button>
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
              Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredApprovers.length)}</span> of <span className="font-semibold text-gray-800">{filteredApprovers.length}</span> records
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