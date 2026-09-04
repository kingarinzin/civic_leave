"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProgramTitlePage() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
  });

  // ─── FETCH ──────────────────────────────────────────
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/hr/program-title");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Program Titles", "error");
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
    setFormData({ title: "", code: "", description: "" });
    setEditData(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formData.title) {
      showNotification("Program Title is required", "error");
      return;
    }
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to add");
      await fetchItems();
      resetForm();
      showNotification("Program Title added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleEdit = (item) => {
    setEditData(item);
    setFormData({
      title: item.title || "",
      code: item.code || "",
      description: item.description || "",
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "PUT",
        body: JSON.stringify({
          _id: editData._id,
          title: formData.title,
          code: formData.code,
          description: formData.description,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchItems();
      resetForm();
      showNotification("Program Title updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "DELETE",
        body: JSON.stringify({ _id: item._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchItems();
      showNotification("Program Title deleted successfully", "success");
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
      (item.title?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.code?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.description?.toLowerCase() || "").includes(search.toLowerCase())
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
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Program Title List</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({ title: "", code: "", description: "" });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Program Title
            </button>
          )}
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

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editData ? "Edit Program Title" : "Add Program Title"}
              </h2>
              <button
                onClick={() => resetForm()}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Code</label>
                <input
                  name="code"
                  type="text"
                  value={formData.code}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <input
                  name="description"
                  type="text"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => resetForm()}
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

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by title, code or description..."
            className="w-64 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select
              value={rowsPerPage}
              onChange={handleRowsChange}
              className="border rounded px-2 py-1"
            >
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
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  S/N
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "title" ? "bg-blue-100" : ""
                  }`}
                >
                  Title
                </th>
                <th
                  onClick={() => handleSort("code")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "code" ? "bg-blue-100" : ""
                  }`}
                >
                  Code
                </th>
                <th
                  onClick={() => handleSort("description")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "description" ? "bg-blue-100" : ""
                  }`}
                >
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.length > 0 ? (
                paginated.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-100 transition-colors">
                    <td className="px-6 py-3 text-sm">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-3 text-sm">{item.title}</td>
                    <td className="px-6 py-3 text-sm">{item.code || "—"}</td>
                    <td className="px-6 py-3 text-sm">{item.description || "—"}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No records found
                  </td>
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
              className={`font-semibold text-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:text-blue-600"
              }`}
            >
              &lt;
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:text-blue-600"
              }`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}