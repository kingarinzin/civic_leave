"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function HolidayManager() {
  const [holidays, setHolidays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: "start_date", direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    type: "",
    description: "",
  });

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setHolidays(data);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load holidays", "error");
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ start_date: "", end_date: "", type: "", description: "" });
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = async () => {
    if (!formData.start_date || !formData.end_date || !formData.type) {
      showNotification("Start Date, End Date and Type are required", "error");
      return;
    }
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to add");
      await fetchHolidays();
      resetForm();
      setShowForm(false);
      showNotification("Holiday added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleEdit = (holiday) => {
    setEditData(holiday);
    setFormData({
      start_date: holiday.start_date.slice(0, 10),
      end_date: holiday.end_date.slice(0, 10),
      type: holiday.type,
      description: holiday.description || "",
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
  console.log("Updating holiday with id:", editData.id);
  console.log("Data being sent:", formData);

    if (!editData) return;
    try {
      const res = await fetch(`/api/holidays/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchHolidays();
      resetForm();
      setEditData(null);
      setShowForm(false);
      showNotification("Holiday updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (holiday) => {
    if (!confirm(`Delete "${holiday.type}" on ${holiday.start_date}?`)) return;
    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchHolidays();
      showNotification("Holiday deleted successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  // Sorting, filtering, pagination (same as before)
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
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

  const filteredHolidays = holidays.filter(
    (h) =>
      (h.type?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (h.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (h.start_date?.includes(search))
  );

  const sortedHolidays = [...filteredHolidays];
  if (sortConfig.key) {
    sortedHolidays.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === "start_date" || sortConfig.key === "end_date") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sortedHolidays.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedHolidays = sortedHolidays.slice(startIndex, endIndex);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Holiday List</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                resetForm();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Add Holiday
            </button>
          )}
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 px-4 py-2 rounded ${
              notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">{editData ? "Edit Holiday" : "Add Holiday"}</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditData(null);
                  resetForm();
                }}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Holiday Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="" disabled>Select holiday type</option>
                  <option value="Government">Government Holiday</option>
                  <option value="Activity Holiday">Activity Holiday</option>
                  <option value="Seminar">Seminar</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="Optional"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditData(null);
                  resetForm();
                }}
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

        {/* Search & Rows per page */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by type, description or start date..."
            className="w-80 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th onClick={() => handleSort("start_date")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer">
                  Start Date {sortConfig.key === "start_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th onClick={() => handleSort("end_date")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer">
                  End Date {sortConfig.key === "end_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th onClick={() => handleSort("type")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer">
                  Type {sortConfig.key === "type" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "▲▼"}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Description</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedHolidays.length > 0 ? (
                paginatedHolidays.map((holiday, index) => (
                  <tr key={holiday.id} className="hover:bg-gray-100">
                    <td className="px-6 py-3 text-sm">{startIndex + index + 1}</td>
                    <td className="px-6 py-3 text-sm">{holiday.start_date}</td>
                    <td className="px-6 py-3 text-sm">{holiday.end_date}</td>
                    <td className="px-6 py-3 text-sm">{holiday.type}</td>
                    <td className="px-6 py-3 text-sm">{holiday.description || "—"}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(holiday)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(holiday)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">No holidays found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-4 mt-5 text-sm">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
            >
              &lt;
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}