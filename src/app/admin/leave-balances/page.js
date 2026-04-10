"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function LeaveBalancesPage() {
  const [data, setData] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({});
  const [remarks, setRemarks] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    const res = await fetch("/api/leave-balances");
    const json = await res.json();
    setData(json);
  };

  const fetchLeaveTypes = async () => {
    const res = await fetch("/api/leave-types");
    const json = await res.json();
    setLeaveTypes(json);
  };

  useEffect(() => {
    fetchData();
    fetchLeaveTypes();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================= ADD =================
  const handleAdd = async () => {
    try {
      await fetch("/api/leave-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      fetchData();
      setShowForm(false);
      setFormData({});
      showNotification("Leave allocated successfully");
    } catch (err) {
      showNotification("Allocation failed", "error");
    }
  };

  // ================= EDIT =================
  const handleEdit = (row) => {
    const allocationMap = {};
    row.leaves.forEach((l) => {
      allocationMap[l.leaveTypeId] = l.allocated;
    });

    setFormData(allocationMap);
    setRemarks(row.remarks || "");
    setEditData(row);
    setShowForm(true);
  };

  // ================= UPDATE =================
  const handleUpdate = async () => {
    try {
      const updatedLeaves = leaveTypes.map((lt) => {
        const existing = editData.leaves.find(
          (l) => l.leaveTypeId.toString() === lt._id.toString()
        );

        return {
          leaveTypeId: lt._id,
          leaveTypeName: lt.name,
          allocated: Number(formData[lt._id] || 0),
          used: existing?.used || 0,
        };
      });

      await fetch("/api/leave-balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editData._id,
          leaves: updatedLeaves,
          remarks,
        }),
      });

      fetchData();
      setShowForm(false);
      setEditData(null);
      showNotification("Updated successfully");
    } catch {
      showNotification("Update failed", "error");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (row) => {
    if (!confirm(`Delete leave record for ${row.userName}?`)) return;

    await fetch("/api/leave-balances", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: row._id }),
    });

    fetchData();
    showNotification("Deleted successfully");
  };

  // ================= FILTER + SORT =================
  const filtered = data.filter((row) =>
    row.userName?.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key])
        return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key])
        return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  // ================= PAGE NUMBER RENDER =================
  const renderPageNumbers = () => {
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 border rounded ${
            currentPage === i ? "bg-black text-white" : "bg-white"
          }`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Leave Balance List</h1>

          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({});
                setRemarks("");
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Allocate Leave
            </button>
          )}
        </div>

        {/* FORM */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editData ? "Edit Leave Allocation" : "Allocate Leave (All Users)"}
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {leaveTypes.map((lt) => (
                <div key={lt._id}>
                  <label className="text-sm font-medium">{lt.name}</label>
                  <input
                    type="number"
                    value={formData[lt._id] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [lt._id]: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                <X size={14} /> Cancel
              </button>

              <button
                onClick={editData ? handleUpdate : handleAdd}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                {editData ? <Check size={14} /> : <Save size={14} />}
                {editData ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* SEARCH */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-4 py-2 border rounded"
          />
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">User</th>

                {leaveTypes.map((lt) => (
                  <th key={lt._id} className="px-6 py-3 text-center text-sm font-medium uppercase">
                    {lt.name}
                  </th>
                ))}

                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Remarks</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paginated.map((row, index) => (
                <tr key={row._id} className="hover:bg-gray-100">
                  <td className="px-6 py-3">{startIndex + index + 1}</td>
                  <td className="px-6 py-3">{row.userName}</td>

                  {leaveTypes.map((lt) => {
                    const leave = row.leaves?.find(
                      (l) => l.leaveTypeId.toString() === lt._id.toString()
                    );
                    return (
                      <td key={lt._id} className="px-6 py-3 text-center">
                        {leave?.allocated || 0}
                      </td>
                    );
                  })}

                  <td className="px-6 py-3">{row.remarks}</td>

                  <td className="px-6 py-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(row)}
                      className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(row)}
                      className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            {renderPageNumbers()}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}