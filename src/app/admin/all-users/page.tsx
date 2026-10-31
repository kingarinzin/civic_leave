"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff, Trash2, Edit, Search, Filter, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface User {
  _id: string;
  name: string;
  cid: string;
  designation: string;
  phone: string;
  email: string;
  departmentName: string;
  divisionName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Helper: get initials from full name (e.g., "Kinga Rinzin" -> "KR")
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Helper: generate a consistent pastel color based on name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AllUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // JWT Verification & Fetch Users
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/all-users", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.clear();
          router.push("/login?expired=true");
          return;
        }

        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [router]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = async (
    userId: string,
    action: "toggleStatus" | "delete",
    currentStatus?: boolean,
  ) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("token");
      let url = "";
      let method: "POST" | "DELETE" = "POST";
      let body: { userId: string; isActive?: boolean } = { userId };

      if (action === "toggleStatus") {
        url = "/api/admin/toggle-user-status";
        body = { userId, isActive: !currentStatus };
      } else if (action === "delete") {
        url = `/api/admin/delete-user?userId=${userId}`;
        method = "DELETE";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: method === "POST" ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        showNotification(
          action === "delete"
            ? "User deleted"
            : `User ${!currentStatus ? "activated" : "deactivated"}`,
          "success",
        );
        const refreshed = await fetch("/api/admin/all-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await refreshed.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        showNotification(data.error || "Action failed", "error");
      }
    } catch {
      showNotification("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/update-user-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        showNotification("Role updated", "success");
        const refreshed = await fetch("/api/admin/all-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await refreshed.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        showNotification(data.error || "Failed to update role", "error");
      }
    } catch {
      showNotification("Failed to update role", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterRole("");
    setFilterDept("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  // Get unique departments for the filter dropdown
  const uniqueDepts = Array.from(new Set(users.map((u) => u.departmentName).filter(Boolean))).sort();

  // Filter & Pagination Logic
  const filteredUsers = users.filter((u) => {
    const searchStr = search.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(searchStr) ||
      u.cid.includes(searchStr) ||
      u.email.toLowerCase().includes(searchStr) ||
      u.designation.toLowerCase().includes(searchStr);
      
    const matchesRole = filterRole === "" || u.role === filterRole;
    const matchesDept = filterDept === "" || u.departmentName === filterDept;
    
    const matchesStatus = 
      filterStatus === "" || 
      (filterStatus === "ACTIVE" && u.isActive) || 
      (filterStatus === "INACTIVE" && !u.isActive);

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-100 relative text-black font-sans">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 w-full">
        <div className="max-w-[1600px] mx-auto w-full">
          
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage all registered users – view, edit roles, activate/deactivate, or delete accounts.
              </p>
            </div>
            <div className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 font-medium">
              Total users: <span className="font-bold text-blue-600">{users.length}</span>
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
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search name, CID, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                <Filter size={16} className="text-gray-400" />
                Filters:
              </div>

              {/* Department Filter */}
              <select
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition max-w-[150px]"
              >
                <option value="">All Depts</option>
                {uniqueDepts.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Roles</option>
                <option value="Officer">Officer</option>
                <option value="DivisionHead">Division Head</option>
                <option value="DepartmentHead">Department Head</option>
                <option value="Commissioner">Commissioner</option>
                <option value="Chairperson">Chairperson</option>
                <option value="SecretaryService">Secretary Service</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              {/* Clear Filters */}
              {(search || filterRole || filterDept || filterStatus) && (
                <button 
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                >
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>

            {/* Rows per page */}
            <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
              <span>Show</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                className="border rounded px-2 py-1 outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span className="font-medium text-gray-800">{filteredUsers.length} records</span>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-[1000px] w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">User</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">CID</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Designation</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Division</th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(user.name)}`}>
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.cid}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{user.designation}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{user.departmentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{user.divisionName}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role || "Officer"}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={actionLoading === user._id}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-blue-400 outline-none font-medium"
                        >
                          <option value="Officer">Officer</option>
                          <option value="DivisionHead">Division Head</option>
                          <option value="DepartmentHead">Department Head</option>
                          <option value="Commissioner">Commissioner</option>
                          <option value="Chairperson">Chairperson</option>
                          <option value="SecretaryService">Secretary Service</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleAction(user._id, "toggleStatus", user.isActive)}
                            disabled={actionLoading === user._id}
                            className={`p-1.5 rounded-md transition ${
                              user.isActive 
                                ? "text-red-600 hover:bg-red-50" 
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {actionLoading === user._id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : user.isActive ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>

                          <button
                            onClick={() => router.push(`/admin/all-users/${user._id}/edit`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleAction(user._id, "delete")}
                            disabled={actionLoading === user._id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
              <div>
                Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredUsers.length)}</span> of <span className="font-semibold text-gray-800">{filteredUsers.length}</span> records
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
      </main>
    </div>
  );
}