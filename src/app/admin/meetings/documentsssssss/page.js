"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  XCircle,
  Eye,
  Trash2,
  ChevronUp,
  Plus,
  Download,
  X,
  FileText,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB");
};

const truncateWords = (text, numWords = 4) => {
  if (!text) return "—";
  const words = text.split(/\s+/);
  if (words.length <= numWords) return text;
  return words.slice(0, numWords).join(" ") + "...";
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewedItemId, setViewedItemId] = useState(null);
  const [highlightedRowId, setHighlightedRowId] = useState(null);

  // Viewer modal state
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewerFileUrl, setViewerFileUrl] = useState("");
  const [viewerFileName, setViewerFileName] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    documentType: "",
    commission: "",
    year: "",
  });

  // Dropdown options – fallback data
  const [dropdowns, setDropdowns] = useState({
    documentTypes: [
      { id: "1", name: "Commission Meeting Minutes" },
      { id: "2", name: "HR Minutes" },
      { id: "3", name: "Admin Minutes" },
    ],
    commissions: [
      { id: "1", name: "1st Commission" },
      { id: "2", name: "2nd Commission" },
      { id: "3", name: "3rd Commission" },
      { id: "4", name: "4th Commission" },
    ],
  });

  // ─── Form state ────────────────────────────────────
  const [formData, setFormData] = useState({
    display_order: "",
    document_type: "",
    commission: "",
    year: new Date().getFullYear().toString(),
    subject: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // ─── Fetch dropdown options ────────────────────────
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await fetch("/api/meetings/documents_dropdowns");
        if (res.ok) {
          const data = await res.json();
          if (data.documentTypes?.length > 0) {
            setDropdowns((prev) => ({
              ...prev,
              documentTypes: data.documentTypes,
            }));
          }
          if (data.commissions?.length > 0) {
            setDropdowns((prev) => ({
              ...prev,
              commissions: data.commissions,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch dropdowns", err);
      }
    };
    fetchDropdowns();
  }, []);

  // ─── Set default form values ──────────────────────
  useEffect(() => {
    if (dropdowns.documentTypes.length > 0 && !formData.document_type) {
      setFormData((prev) => ({
        ...prev,
        document_type: dropdowns.documentTypes[0].name,
      }));
    }
    if (dropdowns.commissions.length > 0 && !formData.commission) {
      setFormData((prev) => ({
        ...prev,
        commission: dropdowns.commissions[0].name,
      }));
    }
  }, [dropdowns, formData.document_type, formData.commission]);

  // ─── Fetch documents ──────────────────────────────
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.documentType) params.append("type", filters.documentType);
      if (filters.commission) params.append("commission", filters.commission);
      if (filters.year) params.append("year", filters.year);

      const res = await fetch(`/api/meetings/documents?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();
      const items = Array.isArray(data)
        ? data.map((item) => ({ ...item, id: item._id || item.id }))
        : [];
      setDocuments(items);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load documents", "error");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  // ─── Handlers ──────────────────────────────────────
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ documentType: "", commission: "", year: "" });
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  // ─── Delete ────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/meetings/documents?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      await fetchDocuments();
      showNotification("Document deleted successfully", "success");
      if (editingId === id) closeForm();
      if (viewedItemId === id) setViewedItemId(null);
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  // ─── View file in modal ───────────────────────────
  const openViewer = (doc) => {
    try {
      fetch(`/api/meetings/documents/${doc.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "Current User", action: "Viewed" }),
      });
    } catch (e) {}
    setViewerFileUrl(doc.file_url);
    setViewerFileName(doc.file_url.split("/").pop() || "document.pdf");
    setShowViewerModal(true);
  };

  const closeViewer = () => {
    setShowViewerModal(false);
    setViewerFileUrl("");
    setViewerFileName("");
  };

  // ─── Download ──────────────────────────────────────
  const handleDownload = async (doc) => {
    try {
      await fetch(`/api/meetings/documents/${doc.id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "Current User", action: "Downloaded" }),
      });
    } catch (e) {}
    window.open(doc.file_url, "_blank");
  };

  // ─── Toggle details ───────────────────────────────
  const toggleDetails = (doc) => {
    if (highlightedRowId) {
      closeForm();
    }
    setViewedItemId(viewedItemId === doc.id ? null : doc.id);
  };

  // ─── Open form for Add ────────────────────────────
  const openAddForm = () => {
    if (viewedItemId) setViewedItemId(null);
    closeForm();

    setEditMode(false);
    setEditingId(null);
    setHighlightedRowId(null);
    setShowAddForm(true);
    setFormError("");
    setFormData({
      display_order: "",
      document_type: dropdowns.documentTypes[0]?.name || "",
      commission: dropdowns.commissions[0]?.name || "",
      year: new Date().getFullYear().toString(),
      subject: "",
    });
    setSelectedFile(null);
    setExistingFile(null);
    setRemoveExisting(false);
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
  };

  // ─── Open form for Edit ────────────────────────────
  const openEditForm = (doc) => {
    if (viewedItemId) setViewedItemId(null);
    closeForm();

    setEditMode(true);
    setEditingId(doc.id);
    setHighlightedRowId(doc.id);
    setShowAddForm(true);
    setFormError("");
    setFormData({
      display_order: doc.display_order || "",
      document_type: doc.document_type || "",
      commission: doc.commission || "",
      year: doc.year || "",
      subject: doc.subject || "",
    });
    setExistingFile({
      url: doc.file_url,
      name: doc.original_filename || doc.file_url.split("/").pop() || "document",
    });
    setSelectedFile(null);
    setRemoveExisting(false);
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditMode(false);
    setEditingId(null);
    setHighlightedRowId(null);
    setFormError("");
    setFormLoading(false);
    setSelectedFile(null);
    setExistingFile(null);
    setRemoveExisting(false);
  };

  // ─── File handlers ─────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("File size must be less than 5MB");
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      setFormError("");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
  };

  const removeExistingFile = () => {
    setRemoveExisting(true);
    setExistingFile(null);
  };

  // ─── Submit ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    // Validation
    if (!formData.document_type) {
      setFormError("Please select a document type");
      setFormLoading(false);
      return;
    }
    if (!formData.commission) {
      setFormError("Please select a commission");
      setFormLoading(false);
      return;
    }
    if (!formData.display_order) {
      setFormError("Display order is required");
      setFormLoading(false);
      return;
    }
    if (!formData.subject.trim()) {
      setFormError("Subject is required");
      setFormLoading(false);
      return;
    }

    if (!editMode && !selectedFile) {
      setFormError("Please select a file to upload");
      setFormLoading(false);
      return;
    }
    if (editMode && removeExisting && !selectedFile) {
      setFormError("You removed the existing file. Please upload a new file.");
      setFormLoading(false);
      return;
    }

    const isUpdate = editMode && editingId;

    let payload;
    let url = "/api/meetings/documents";
    let method = "POST";

    if (isUpdate) {
      url = `/api/meetings/documents?id=${editingId}`;
      method = "PUT";
      const jsonPayload = {
        display_order: formData.display_order,
        document_type: formData.document_type,
        commission: formData.commission,
        year: formData.year,
        subject: formData.subject,
        removeExisting: removeExisting,
      };
      if (selectedFile) {
        const reader = new FileReader();
        const fileBase64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(selectedFile);
        });
        jsonPayload.fileBase64 = fileBase64;
        jsonPayload.fileName = selectedFile.name;
      }
      payload = JSON.stringify(jsonPayload);
    } else {
      const formDataPayload = new FormData();
      formDataPayload.append("display_order", formData.display_order);
      formDataPayload.append("document_type", formData.document_type);
      formDataPayload.append("commission", formData.commission);
      formDataPayload.append("year", formData.year);
      formDataPayload.append("subject", formData.subject);
      formDataPayload.append("file", selectedFile);
      payload = formDataPayload;
    }

    try {
      let res;
      if (isUpdate) {
        res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          body: payload,
        });
      }

      let errorMsg = "Operation failed";
      let responseData = {};
      try {
        responseData = await res.json();
        if (responseData.error) errorMsg = responseData.error;
      } catch (parseErr) {
        if (!res.ok) errorMsg = `Server error (${res.status})`;
      }

      if (!res.ok) {
        if (res.status === 404) {
          errorMsg = "Document no longer exists. It may have been deleted.";
          closeForm();
          await fetchDocuments();
        }
        throw new Error(errorMsg);
      }

      await fetchDocuments();
      closeForm();
      showNotification(
        isUpdate ? "Document updated successfully" : "Document uploaded successfully",
        "success"
      );
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Operation failed. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Filtering & Sorting ──────────────────────────
  const filtered = documents.filter((doc) => {
    const searchLower = search.toLowerCase();
    const searchable = [
      doc.document_type,
      doc.commission,
      doc.year,
      doc.subject,
      doc.file_url,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchLower);
  });

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      if (sortConfig.key === "display_order" || sortConfig.key === "id") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (sortConfig.key === "date") {
        aVal = new Date(aVal).getTime() || 0;
        bVal = new Date(bVal).getTime() || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  // ─── Render ────────────────────────────────────────
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Meeting Documents</h1>
          <button
            onClick={() => {
              if (showAddForm) closeForm();
              else openAddForm();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
          >
            <Plus size={14} />
            {showAddForm ? "Cancel" : "Add Document"}
          </button>
        </div>

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

        {/* ─── Toolbar ─────────────────────────────────── */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-96">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by type, commission, year, subject, file..."
                className="w-full px-4 py-2 pr-10 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition ${
                showFilters
                  ? "bg-blue-50 border-blue-400 text-blue-600"
                  : "hover:border-gray-400"
              }`}
            >
              <Filter size={16} />
              Filters
              {Object.values(filters).some((v) => v) && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          </div>
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

        {/* ─── Filters Panel ──────────────────────────── */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Document Filters</h3>
              <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <XCircle size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Document Type</label>
                <select name="documentType" value={filters.documentType} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">All Types</option>
                  {dropdowns.documentTypes.map((type) => (<option key={type.id} value={type.name}>{type.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Commission</label>
                <select name="commission" value={filters.commission} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">All Commissions</option>
                  {dropdowns.commissions.map((comm) => (<option key={comm.id} value={comm.name}>{comm.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Year</label>
                <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">All Years</option>
                  <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── Add/Edit Form ──────────────────────────── */}
        {showAddForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editMode ? "Edit Document" : "Add New Document"}</h2>
              <button onClick={closeForm} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">❌ {formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order *</label>
                  <input type="number" name="display_order" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                  <select name="document_type" value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                    {dropdowns.documentTypes.map((type) => (<option key={type.id} value={type.name}>{type.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission *</label>
                  <select name="commission" value={formData.commission} onChange={(e) => setFormData({ ...formData, commission: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                    {dropdowns.commissions.map((comm) => (<option key={comm.id} value={comm.name}>{comm.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select name="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                    <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" name="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Brief description" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{editMode ? "Replace File (optional)" : "Upload File *"}</label>
                <div className="flex flex-col space-y-2">
                  <input id="fileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editMode && existingFile && !removeExisting && !selectedFile && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm border border-blue-200">
                        <FileText size={14} />
                        <span className="max-w-xs truncate">{existingFile.name}</span>
                        <button type="button" onClick={removeExistingFile} className="text-blue-700 hover:text-red-600 transition"><X size={16} /></button>
                      </div>
                    )}
                    {selectedFile && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-200">
                        <FileText size={14} />
                        <span className="max-w-xs truncate">{selectedFile.name}</span>
                        <button type="button" onClick={removeSelectedFile} className="text-green-700 hover:text-red-600 transition"><X size={16} /></button>
                      </div>
                    )}
                    {!editMode && !selectedFile && <span className="text-sm text-gray-400">No file selected</span>}
                    {editMode && !existingFile && !selectedFile && removeExisting && <span className="text-sm text-red-500">⚠️ File removed – upload a new one</span>}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                  {formLoading ? (<><span className="inline-block animate-spin mr-2">⟳</span> {editMode ? "Updating..." : "Uploading..."}</>) : (editMode ? "Update" : "Upload")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Table ───────────────────────────────────── */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">S/N</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("display_order")}>Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("date")}>Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("document_type")}>Document Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Commission / Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("subject")}>Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-6 text-gray-500">No documents found</td></tr>
              ) : (
                paginated.map((doc, index) => {
                  const isExpanded = viewedItemId === doc.id;
                  const isEditing = highlightedRowId === doc.id && showAddForm;

                  return (
                    <React.Fragment key={doc.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${
                          isExpanded || isEditing
                            ? "bg-blue-50 border-l-4 border-blue-400"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 text-sm">{doc.display_order}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(doc.date)}</td>
                        <td className="px-4 py-3 text-sm">{doc.document_type}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium">{doc.commission}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{doc.year}</span>
                        </td>
                        <td className="px-4 py-3 text-sm" title={doc.subject}>
                          {truncateWords(doc.subject, 4)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => openViewer(doc)} className="text-blue-600 hover:underline mr-2 flex items-center gap-1" title="View file">
                            <FileText size={14} /> View
                          </button>
                          <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:underline flex items-center gap-1" title="Download file">
                            <Download size={14} /> Download
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button onClick={() => toggleDetails(doc)} className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-blue-500 hover:text-blue-500 transition">
                            {isExpanded ? <><ChevronUp size={14} /> Close</> : <><Eye size={14} /> Details</>}
                          </button>
                          <button onClick={() => openEditForm(doc)} className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-yellow-500 hover:text-yellow-500 transition">
                            <Pencil size={14} /> Edit
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition">
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>

                      {/* ─── Inline Details Panel ──────────── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-gray-50/80 border-t border-blue-200">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <h4 className="text-md font-semibold text-gray-800">Document Details</h4>
                                <Link href={`/admin/meetings/documents/${doc.id}/logs`} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                  <Eye size={14} /> View Access Logs
                                </Link>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <div><span className="font-medium text-gray-500">Display Order:</span> {doc.display_order}</div>
                                <div><span className="font-medium text-gray-500">Date:</span> {formatDate(doc.date)}</div>
                                <div><span className="font-medium text-gray-500">Document Type:</span> {doc.document_type}</div>
                                <div><span className="font-medium text-gray-500">Commission:</span> {doc.commission}</div>
                                <div><span className="font-medium text-gray-500">Year:</span> {doc.year}</div>
                                <div className="col-span-2"><span className="font-medium text-gray-500">Subject:</span> {doc.subject}</div>
                                <div className="col-span-2"><span className="font-medium text-gray-500">File:</span> <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{doc.file_url.split("/").pop()}</a></div>
                                {doc.original_filename && <div className="col-span-2"><span className="font-medium text-gray-500">Original Filename:</span> {doc.original_filename}</div>}
                              </div>
                              <div className="flex gap-3 pt-2 border-t border-gray-200">
                                <button onClick={() => openViewer(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition"><FileText size={14} /> View File</button>
                                <button onClick={() => handleDownload(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-md text-xs font-medium hover:bg-green-100 transition"><Download size={14} /> Download File</button>
                                <button onClick={() => openEditForm(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-md text-xs font-medium hover:bg-yellow-100 transition"><Pencil size={14} /> Edit</button>
                                <button onClick={() => handleDelete(doc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-medium hover:bg-red-100 transition"><Trash2 size={14} /> Delete</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* ─── Inline Edit Form ──────────────── */}
                      {isEditing && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-white border-t border-gray-200">
                            <div className="w-full">
                              <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">{editMode ? "Edit Document" : "Add New Document"}</h2>
                                <button onClick={closeForm} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                              </div>

                              {formError && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">❌ {formError}</div>
                              )}

                              <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order *</label>
                                    <input type="number" name="display_order" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required min="1" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                                    <select name="document_type" value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                                      {dropdowns.documentTypes.map((type) => (<option key={type.id} value={type.name}>{type.name}</option>))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission *</label>
                                    <select name="commission" value={formData.commission} onChange={(e) => setFormData({ ...formData, commission: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                                      {dropdowns.commissions.map((comm) => (<option key={comm.id} value={comm.name}>{comm.name}</option>))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                                    <select name="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required>
                                      <option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                  <input type="text" name="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Brief description" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500" required />
                                </div>

                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{editMode ? "Replace File (optional)" : "Upload File *"}</label>
                                  <div className="flex flex-col space-y-2">
                                    <input id="fileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {editMode && existingFile && !removeExisting && !selectedFile && (
                                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm border border-blue-200">
                                          <FileText size={14} />
                                          <span className="max-w-xs truncate">{existingFile.name}</span>
                                          <button type="button" onClick={removeExistingFile} className="text-blue-700 hover:text-red-600 transition"><X size={16} /></button>
                                        </div>
                                      )}
                                      {selectedFile && (
                                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-200">
                                          <FileText size={14} />
                                          <span className="max-w-xs truncate">{selectedFile.name}</span>
                                          <button type="button" onClick={removeSelectedFile} className="text-green-700 hover:text-red-600 transition"><X size={16} /></button>
                                        </div>
                                      )}
                                      {!editMode && !selectedFile && <span className="text-sm text-gray-400">No file selected</span>}
                                      {editMode && !existingFile && !selectedFile && removeExisting && <span className="text-sm text-red-500">⚠️ File removed – upload a new one</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                  <button type="button" onClick={closeForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                                  <button type="submit" disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                                    {formLoading ? (<><span className="inline-block animate-spin mr-2">⟳</span> {editMode ? "Updating..." : "Uploading..."}</>) : (editMode ? "Update" : "Upload")}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ──────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-4 mt-5 text-sm">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&lt;</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&gt;</button>
          </div>
        )}

        {/* ─── PDF Viewer Modal ───────────────────────── */}
        {showViewerModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeViewer}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">📄 {viewerFileName}</h3>
                <button onClick={closeViewer} className="text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                <iframe src={viewerFileUrl} className="w-full h-[75vh] border-0 rounded" title="PDF Viewer" allowFullScreen />
              </div>
              <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500 flex justify-between items-center">
                <span>File: {viewerFileName}</span>
                <a href={viewerFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}