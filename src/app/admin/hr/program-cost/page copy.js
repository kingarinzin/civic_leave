"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Filter, RefreshCw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProgramCostPage() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    programCostType: "",
    totalAmount: "",
    remarks: "",
  });

  // ─── FETCH ──────────────────────────────────────────
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/hr/program-cost");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Program Costs", "error");
      setItems([]);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // ─── HANDLERS ──────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ programCostType: "", totalAmount: "", remarks: "" });
    setEditData(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formData.programCostType.trim() || !formData.totalAmount) {
      showNotification("Program Cost Type and Total Amount are required", "error");
      return;
    }
    try {
      const res = await fetch("/api/hr/program-cost", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add");
      }
      await fetchItems();
      resetForm();
      showNotification("Program Cost added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleEdit = (item) => {
    setEditData(item);
    setFormData({
      programCostType: item.programCostType || "",
      totalAmount: item.totalAmount || "",
      remarks: item.remarks || "",
    });
    setShowForm(false); // Close add form if open
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch("/api/hr/program-cost", {
        method: "PUT",
        body: JSON.stringify({
          _id: editData._id,
          programCostType: formData.programCostType,
          totalAmount: formData.totalAmount,
          remarks: formData.remarks,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      await fetchItems();
      resetForm();
      showNotification("Program Cost updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.programCostType}"?`))
      return;
    try {
      const res = await fetch("/api/hr/program-cost", {
        method: "DELETE",
        body: JSON.stringify({ _id: item._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      await fetchItems();
      showNotification("Program Cost deleted successfully", "success");
      if (editData?._id === item._id) resetForm();
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── SORT & FILTER ─────────────────────────────────
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const filtered = items.filter(
    (item) =>
      (item.programCostType?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.remarks?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.totalAmount?.toString() || "").includes(search)
  );

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  // ─── RENDER ────────────────────────────────────────
  return (
    <div className="flex w-full min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Program Cost List</h1>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-4 px-4 py-2 rounded ${
                notification.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Toolbar with Filters */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* Add Button */}
              {!showForm && !editData && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white border rounded-md text-xs font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={14} />
                  Add Program Cost
                </button>
              )}

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search (type, amount, remarks)..."
                className="w-full sm:w-64 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />

              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                <Filter size={16} className="text-gray-400" />
                Filters:
              </div>

              {/* Clear Search */}
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                  title="Clear search"
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
                onChange={handleRowsChange}
                className="border rounded px-2 py-1 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
              </select>
              <span className="font-medium text-gray-800">
                {filtered.length} records
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    S/N
                  </th>
                  <th
                    onClick={() => handleSort("programCostType")}
                    className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                  >
                    Program Cost Type {sortConfig.key === "programCostType" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    onClick={() => handleSort("totalAmount")}
                    className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                  >
                    Total Amount {sortConfig.key === "totalAmount" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    onClick={() => handleSort("remarks")}
                    className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                  >
                    Remarks {sortConfig.key === "remarks" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                
                {/* GLOBAL ADD FORM (Below Toolbar) */}
                {showForm && !editData && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="p-4 border-b">
                      <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                        {/* ROUNDED ORANGE DIVIDER */}
                        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>

                        <div className="flex justify-between mb-4 items-center">
                          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Plus size={18} className="text-blue-600"/> Create New Program Cost
                          </h2>
                          <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium">Program Cost Type *</label>
                            <input
                              name="programCostType"
                              type="text"
                              value={formData.programCostType}
                              onChange={handleFormChange}
                              className="w-full border rounded px-3 py-2"
                              placeholder="e.g., Training Materials"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Total Amount (Nu.) *</label>
                            <input
                              name="totalAmount"
                              type="number"
                              value={formData.totalAmount}
                              onChange={handleFormChange}
                              className="w-full border rounded px-3 py-2"
                              placeholder="e.g., 15000"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Remarks</label>
                            <input
                              name="remarks"
                              type="text"
                              value={formData.remarks}
                              onChange={handleFormChange}
                              className="w-full border rounded px-3 py-2"
                              placeholder="Optional details"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                          <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition">
                            <X size={16} /> Cancel
                          </button>
                          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                            <Save size={16} /> Save Program Cost
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* DATA ROWS */}
                {paginated.length > 0 ? (
                  paginated.map((item, index) => {
                    const isEditing = editData?._id === item._id;
                    const rowSNumber = startIndex + index + 1;

                    return (
                      <React.Fragment key={item._id}>
                        {/* MAIN ROW */}
                        <tr
                          className={`transition-colors align-top ${
                            isEditing ? "bg-blue-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-2 py-3 text-sm text-gray-500">
                            {rowSNumber}
                          </td>
                          <td className="px-2 py-3 text-sm font-medium text-gray-800">
                            {item.programCostType}
                          </td>
                          <td className="px-2 py-3 text-sm font-medium text-gray-800">
                            Nu. {Number(item.totalAmount).toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-600">
                            {item.remarks || "—"}
                          </td>
                          <td className="px-2 py-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {!isEditing && (
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(item)}
                                className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition text-red-500"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* INLINE EDIT FORM */}
                        {isEditing && (
                          <tr>
                            <td colSpan={5} className="p-4 bg-gray-50 border-b border-gray-200">
                              <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                                {/* ROUNDED ORANGE DIVIDER */}
                                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>

                                <div className="flex justify-between mb-4 items-center">
                                  <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                    <Pencil size={18} /> Edit Program Cost: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">{item.programCostType}</span>
                                  </h2>
                                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1">
                                    <X size={20} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Program Cost Type *</label>
                                    <input
                                      name="programCostType"
                                      type="text"
                                      value={formData.programCostType}
                                      onChange={handleFormChange}
                                      className="w-full border rounded px-3 py-2"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Total Amount (Nu.) *</label>
                                    <input
                                      name="totalAmount"
                                      type="number"
                                      value={formData.totalAmount}
                                      onChange={handleFormChange}
                                      className="w-full border rounded px-3 py-2"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Remarks</label>
                                    <input
                                      name="remarks"
                                      type="text"
                                      value={formData.remarks}
                                      onChange={handleFormChange}
                                      className="w-full border rounded px-3 py-2"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-5">
                                  <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition">
                                    <X size={16} /> Cancel
                                  </button>
                                  <button onClick={handleUpdate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                                    <Check size={16} /> Save Changes
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
              <div>
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(startIndex + rowsPerPage, sorted.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">
                  {sorted.length}
                </span>{" "}
                records
              </div>
              <div className="flex items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  &lt;
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
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