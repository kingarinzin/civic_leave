"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff, Trash2 } from "lucide-react";
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

export default function AllUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [search, setSearch] = useState("");
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
          // Invalid or expired token
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
        // Refresh users
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

  // Filter & Pagination
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.cid.includes(search) ||
      u.departmentName.toLowerCase().includes(search.toLowerCase()) ||
      u.divisionName.toLowerCase().includes(search.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );

  return (
    <div className="flex min-h-screen bg-white relative text-black">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-4 py-2 rounded-md border shadow-sm z-50 transition-transform duration-300 ${
            notification.type === "success"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black"
          }`}
        >
          {notification.message}
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 md:ml-64">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
          <h4 className="text-xl font-semibold tracking-tight">
            User Registration - <span className="text-gray-600 text-sm md:text-base font-normal">
              View and manage all registered users
            </span>
          </h4>
</div>

        {/* Search & Rows */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-5">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-72 px-3 py-2.5 border border-gray-300 rounded-md bg-white focus:ring-0 focus:border-black outline-none"
          />
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2.5 py-1.5 bg-white focus:ring-0 focus:border-black outline-none"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        </div>

        {/* Users Table */}
        <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    {/* Desktop Table */}
    <table className="w-full min-w-[1100px] table-fixed divide-y divide-gray-200 hidden md:table">
      <thead className="bg-gray-100/60">
        <tr>
          {[
            "Name",
            "CID",
            "Designation",
            "Phone",
            "Email",
            "Department",
            "Division",
            "Role / Change",
            //"Registered",
            "Actions",
          ].map((col) => (
            <th
              key={col}
              className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-700"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200 text-sm">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map((user) => (
            <tr
              key={user._id}
              className="hover:bg-gray-50/80 transition-colors"
            >
              <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                {user.name}
              </td>

              <td className="px-3 py-2 whitespace-nowrap">{user.cid}</td>

              <td className="px-3 py-2 truncate max-w-[120px]">
                {user.designation}
              </td>

              <td className="px-3 py-2 whitespace-nowrap">{user.phone}</td>

              <td className="px-3 py-2 truncate max-w-[180px]">
                {user.email}
              </td>

              <td className="px-3 py-2 truncate max-w-[140px]">
                {user.departmentName}
              </td>

              <td className="px-3 py-2 truncate max-w-[140px]">
                {user.divisionName}
              </td>

              <td className="px-3 py-2 min-w-[180px]">
                <p className="text-[10px] text-gray-500 mb-1">
                  {user.role || "Officer"}
                </p>
                <select
                  value={user.role || "Officer"}
                  onChange={(e) =>
                    handleRoleChange(user._id, e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs w-full bg-white focus:ring-0 focus:border-black outline-none"
                >
                  <option value="Officer">Officer</option>
                  <option value="DivisionHead">Division Head</option>
                  <option value="DepartmentHead">Department Head</option>
                  <option value="Commissioner">Commissioner</option>
                  <option value="Chairperson">Chairperson</option>
                  <option value="SecretaryService">Secretary Service</option>
                </select>
              </td>

             {/*<td className="px-3 py-2 whitespace-nowrap text-gray-700">
                {new Date(user.createdAt).toLocaleDateString()}
              </td> */}

              <td className="px-3 py-2 flex gap-2 flex-wrap">
                <button
                  onClick={() =>
                    handleAction(user._id, "toggleStatus", user.isActive)
                  }
                  disabled={actionLoading === user._id}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition ${
                    user.isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-300"
                  }`}
                >
                  {actionLoading === user._id ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : user.isActive ? (
                    <PowerOff size={12} />
                  ) : (
                    <Power size={12} />
                  )}
                  {user.isActive ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => handleAction(user._id, "delete")}
                  disabled={actionLoading === user._id}
                  className="flex items-center gap-1 px-2 py-1 bg-white text-black border border-gray-300 rounded-md text-[11px]"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={10} className="text-center py-8 text-gray-500">
              No records found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-4 mt-5 text-sm text-gray-700">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "hover:text-black"}`}
            >
              &lt;
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-300 cursor-not-allowed" : "hover:text-black"}`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
