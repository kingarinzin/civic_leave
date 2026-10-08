"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProgramTitlePage() {
  const [items, setItems] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    locationCategory: "Ex-Country",
    trainingGroup: "STT - Short Term Training",
    trainingType: "",
  });

  // Helper to get short display for Training Group
  const getShortTrainingGroup = (fullLabel) => {
    if (fullLabel?.startsWith("STT")) return "STT";
    if (fullLabel?.startsWith("LTT")) return "LTT";
    return fullLabel;
  };

  // ─── FETCH PROGRAM TITLES ──────────────────────────
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/hr/program-title");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Program Catalogue", "error");
      setItems([]);
    }
  };

  // ─── FETCH TRAINING TYPES ──────────────────────────
  const fetchTrainingTypes = async () => {
    try {
      const res = await fetch("/api/hr/training-type");
      if (!res.ok) throw new Error("Failed to fetch training types");
      const data = await res.json();
      setTrainingTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Training Types", "error");
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTrainingTypes();
  }, []);

  // ─── HANDLERS ──────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      locationCategory: "Ex-Country",
      trainingGroup: "STT - Short Term Training",
      trainingType: "",
    });
    setEditData(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      showNotification("Course Title is required", "error");
      return;
    }
    if (!formData.locationCategory) {
      showNotification("Location Category is required", "error");
      return;
    }
    if (!formData.trainingGroup) {
      showNotification("Training Group is required", "error");
      return;
    }
    if (!formData.trainingType) {
      showNotification("Training Type is required", "error");
      return;
    }

    try {
      const res = await fetch("/api/hr/program-title", {
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
      showNotification("Course added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleEdit = (item) => {
    setEditData(item);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      locationCategory: item.locationCategory || "Ex-Country",
      trainingGroup: item.trainingGroup || "STT - Short Term Training",
      trainingType: item.trainingType?._id || item.trainingType || "",
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
          description: formData.description,
          locationCategory: formData.locationCategory,
          trainingGroup: formData.trainingGroup,
          trainingType: formData.trainingType,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      await fetchItems();
      resetForm();
      showNotification("Course updated successfully", "success");
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      await fetchItems();
      showNotification("Course deleted successfully", "success");
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

  // Search across all fields
  const filtered = items.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      (item.title?.toLowerCase() || "").includes(searchLower) ||
      (item.description?.toLowerCase() || "").includes(searchLower) ||
      (item.locationCategory?.toLowerCase() || "").includes(searchLower) ||
      (item.trainingGroup?.toLowerCase() || "").includes(searchLower) ||
      (item.trainingType?.trainingType?.toLowerCase() || "").includes(
        searchLower
      ) ||
      (item.trainingId?.toLowerCase() || "").includes(searchLower)
    );
  });

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === "trainingType") {
        aVal = a.trainingType?.trainingType || "";
        bVal = b.trainingType?.trainingType || "";
      } else if (sortConfig.key === "trainingGroup") {
        aVal = a.trainingGroup || "";
        bVal = b.trainingGroup || "";
      } else {
        aVal = a[sortConfig.key] ?? "";
        bVal = b[sortConfig.key] ?? "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  // Helper to truncate description
  const truncateText = (text, maxLength = 50) => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // ─── RENDER ────────────────────────────────────────
  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Program Catalogue</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({
                  title: "",
                  description: "",
                  locationCategory: "Ex-Country",
                  trainingGroup: "STT - Short Term Training",
                  trainingType: "",
                });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Add Course
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
                {editData ? "Edit Course" : "Add New Course"}
              </h2>
              <button
                onClick={() => resetForm()}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Location Category *</label>
                <select
                  name="locationCategory"
                  value={formData.locationCategory}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Ex-Country">Ex-Country</option>
                  <option value="In-Country">In-Country</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Training Group *</label>
                <select
                  name="trainingGroup"
                  value={formData.trainingGroup}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="STT - Short Term Training">
                    STT - Short Term Training
                  </option>
                  <option value="LTT - Long Term Training">
                    LTT - Long Term Training
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Training Type *</label>
                <select
                  name="trainingType"
                  value={formData.trainingType}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Training Type</option>
                  {trainingTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.trainingType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Course Title *</label>
                <input
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border rounded px-3 py-2 resize-y"
                  placeholder="Enter description (optional)"
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
            placeholder="Search by any field..."
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
                {/* S/N column removed */}
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                  Training ID
                </th>
                <th
                  onClick={() => handleSort("locationCategory")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "locationCategory" ? "bg-blue-100" : ""
                  }`}
                >
                  Location Category
                </th>
                <th
                  onClick={() => handleSort("trainingGroup")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "trainingGroup" ? "bg-blue-100" : ""
                  }`}
                >
                  Training Group
                </th>
                <th
                  onClick={() => handleSort("trainingType")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "trainingType" ? "bg-blue-100" : ""
                  }`}
                >
                  Training Type
                </th>
                <th
                  onClick={() => handleSort("title")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "title" ? "bg-blue-100" : ""
                  }`}
                >
                  Course Title
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
                  <tr
                    key={item._id}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    {/* Training ID – always on one line, no truncation */}
                    <td className="px-6 py-3 text-sm whitespace-nowrap">
                      {item.trainingId || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {item.locationCategory}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {getShortTrainingGroup(item.trainingGroup)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {item.trainingType?.trainingType || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">{item.title}</td>
                    <td
                      className="px-6 py-3 text-sm"
                      title={item.description || ""}
                    >
                      {truncateText(item.description, 50)}
                    </td>
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
                  <td colSpan="7" className="text-center py-6 text-gray-500">
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