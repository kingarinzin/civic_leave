"use client";

import React, { useState, useEffect, Fragment } from "react";
import {
  Search,
  Filter,
  XCircle,
  Eye,
  Trash2,
  Plus,
  Download,
  Pencil,
  X,
  FileText,
  Calendar,
  Users,
  File,
  Eye as ViewIcon,
  Hash,
  RefreshCw,
  ChevronDown,
  Save,
  Check,
  Send,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SendNotificationModal from "@/components/SendNotificationModal";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB");
};

const YEAR_OPTIONS = [
  "2028","2027","2026","2025","2024","2023","2022",
  "2021","2020","2019","2018","2017","2016",
];

export default function LogMeetingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: "display_order", direction: "desc" });
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sendDocId, setSendDocId] = useState(null);

  // role
  const [userEmail, setUserEmail] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);

  // filters
  const [filters, setFilters] = useState({ documentType: "", commission: "", year: "" });
  const [dropdowns, setDropdowns] = useState({
    documentTypes: [], commissions: [], departments: [], divisions: [],
  });

  // forms
  const [formData, setFormData] = useState({
    display_order: "", document_type: "", commission: "",
    year: new Date().getFullYear().toString(),
    date: new Date().toISOString().split("T")[0],
    subject: "", file: null,
  });
  const [editData, setEditData] = useState(null);
  const [editFormData, setEditFormData] = useState({
    display_order: "", document_type: "", commission: "",
    year: "", date: "", subject: "", file: null,
  });
  const [editExistingFile, setEditExistingFile] = useState(null);
  const [editRemoveExisting, setEditRemoveExisting] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState("");

  // viewer
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewerFileUrl, setViewerFileUrl] = useState("");
  const [viewerFileName, setViewerFileName] = useState("");

  const showNotification = (message, type = "success") => {
    if (type === "success") {
      setSuccessMessage(message);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setSuccessMessage(""); }, 5000);
    } else {
      setError(message);
      setTimeout(() => setError(""), 5000);
    }
  };

  // auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    setIsAdminUser(isAdmin);
    if (token) {
      try {
        const [, payload] = token.split(".");
        const decoded = JSON.parse(atob(payload));
        setUserEmail(decoded?.email || "");
      } catch {}
    }
  }, []);

  const meetingsAllowedEmails = [
    "kwangmo@acc.org.bt","karmawangmo@acc.org.bt","bdorj@acc.org.bt",
    "chekiw@acc.org.bt","tshewangrinzin@acc.org.bt",
  ];
  const canManage = isAdminUser || meetingsAllowedEmails.includes(userEmail);

  // dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await fetch("/api/meetings/documents_dropdowns");
        if (!res.ok) throw new Error("Failed to fetch dropdowns");
        const data = await res.json();
        const types = data.documentTypes || [];
        const comms = data.commissions || [];
        setDropdowns({
          documentTypes: types, commissions: comms,
          departments: data.departments || [], divisions: data.divisions || [],
        });
        if (types.length > 0) setFormData((prev) => ({ ...prev, document_type: types[0].name }));
        if (comms.length > 0) setFormData((prev) => ({ ...prev, commission: comms[0].name }));
      } catch (err) {
        console.error(err);
        showNotification("Failed to load dropdowns", "error");
      }
    };
    fetchDropdowns();
  }, []);

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
    } catch (err) {
      console.error(err);
      showNotification("Failed to load documents", "error");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [filters]);

  // handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setFilters({ documentType: "", commission: "", year: "" });
    setSearch(""); setCurrentPage(1);
  };
  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value)); setCurrentPage(1);
  };
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key) => (sortConfig.key !== key ? null : sortConfig.direction === "asc" ? "↑" : "↓");

  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (editingId === id) closeEditForm();
  };

  const handleDownload = (doc) => window.open(doc.file_url, "_blank");

  const openViewer = (doc) => {
    setViewerFileUrl(doc.file_url);
    setViewerFileName(doc.file_url.split("/").pop() || "document.pdf");
    setShowViewerModal(true);
  };
  const closeViewer = () => {
    setShowViewerModal(false); setViewerFileUrl(""); setViewerFileName("");
  };

  // add form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        showNotification("File size must be less than 50MB", "error");
        e.target.value = ""; return;
      }
      setFormData((prev) => ({ ...prev, file }));
      setError("");
    }
  };
  const resetForm = () => {
    setFormData({
      display_order: "", document_type: dropdowns.documentTypes[0]?.name || "",
      commission: dropdowns.commissions[0]?.name || "",
      year: new Date().getFullYear().toString(),
      date: new Date().toISOString().split("T")[0],
      subject: "", file: null,
    });
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!formData.document_type) return showNotification("Please select a document type", "error");
    if (!formData.commission) return showNotification("Please select a commission", "error");
    if (!formData.subject.trim()) return showNotification("Subject is required", "error");
    if (!formData.file) return showNotification("Please select a file to upload", "error");

    setLoading(true);
    const data = new FormData();
    data.append("display_order", formData.display_order || "999");
    data.append("document_type", formData.document_type);
    data.append("commission", formData.commission);
    data.append("year", formData.year);
    data.append("date", formData.date);
    data.append("subject", formData.subject);
    data.append("file", formData.file);

    try {
      const res = await fetch("/api/meetings/documents", { method: "POST", body: data });
      let errorMsg = "Upload failed";
      try { const r = await res.json(); if (r.error) errorMsg = r.error; }
      catch { if (!res.ok) errorMsg = `Server error (${res.status})`; }
      if (!res.ok) throw new Error(errorMsg);
      showNotification("Document uploaded successfully!", "success");
      resetForm();
      await fetchDocuments();
    } catch (err) {
      showNotification(err.message || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // edit
  const openEditForm = (doc) => {
    setShowAddForm(false);
    setEditingId(doc.id);
    setEditFormError("");
    setEditFormData({
      display_order: doc.display_order || "",
      document_type: doc.document_type || "",
      commission: doc.commission || "",
      year: doc.year || "",
      date: doc.date || "",
      subject: doc.subject || "",
      file: null,
    });
    setEditExistingFile({
      url: doc.file_url,
      name: doc.original_filename || doc.file_url.split("/").pop() || "document",
    });
    setEditRemoveExisting(false);
    const input = document.getElementById("editFileInput");
    if (input) input.value = "";
    setExpandedRows((prev) => new Set([...prev, doc.id]));
  };
  const closeEditForm = () => {
    setEditingId(null);
    setEditFormError(""); setEditFormLoading(false);
    setEditExistingFile(null); setEditRemoveExisting(false);
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setEditFormError("File size must be less than 50MB"); e.target.value = ""; return;
      }
      setEditFormData((prev) => ({ ...prev, file })); setEditFormError("");
    }
  };
  const removeEditSelectedFile = () => {
    setEditFormData((prev) => ({ ...prev, file: null }));
    const input = document.getElementById("editFileInput");
    if (input) input.value = "";
  };
  const removeEditExistingFile = () => { setEditRemoveExisting(true); setEditExistingFile(null); };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError(""); setEditFormLoading(true);
    if (!editFormData.document_type) { setEditFormError("Please select a document type"); setEditFormLoading(false); return; }
    if (!editFormData.commission) { setEditFormError("Please select a commission"); setEditFormLoading(false); return; }
    if (!editFormData.subject.trim()) { setEditFormError("Subject is required"); setEditFormLoading(false); return; }
    if (!editFormData.date) { setEditFormError("Date is required"); setEditFormLoading(false); return; }
    if (editRemoveExisting && !editFormData.file) { setEditFormError("You removed the file. Please upload a new one."); setEditFormLoading(false); return; }

    const jsonPayload = {
      display_order: editFormData.display_order || 999,
      document_type: editFormData.document_type,
      commission: editFormData.commission,
      year: editFormData.year,
      date: editFormData.date,
      subject: editFormData.subject,
      removeExisting: editRemoveExisting,
    };
    if (editFormData.file) {
      const reader = new FileReader();
      const fileBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result); reader.readAsDataURL(editFormData.file);
      });
      jsonPayload.fileBase64 = fileBase64;
      jsonPayload.fileName = editFormData.file.name;
    }
    try {
      const res = await fetch(`/api/meetings/documents?id=${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });
      let errorMsg = "Update failed";
      try { const r = await res.json(); if (r.error) errorMsg = r.error; }
      catch { if (!res.ok) errorMsg = `Server error (${res.status})`; }
      if (!res.ok) {
        if (res.status === 404) { errorMsg = "Document no longer exists."; closeEditForm(); await fetchDocuments(); }
        throw new Error(errorMsg);
      }
      await fetchDocuments();
      closeEditForm();
      showNotification("Document updated successfully!", "success");
    } catch (err) {
      setEditFormError(err.message || "Update failed");
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/meetings/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Delete failed"); }
      await fetchDocuments();
      showNotification("Document deleted successfully!", "success");
      if (editingId === id) closeEditForm();
    } catch (err) {
      showNotification(err.message || "Delete failed", "error");
    }
  };

  // filter & sort
  const filtered = documents.filter((doc) => {
    const s = search.toLowerCase();
    return [doc.document_type, doc.commission, doc.year, doc.subject, doc.file_url]
      .join(" ").toLowerCase().includes(s);
  });
  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      if (sortConfig.key === "display_order" || sortConfig.key === "id") {
        aVal = Number(aVal); bVal = Number(bVal);
      } else if (sortConfig.key === "date") {
        aVal = new Date(aVal).getTime() || 0; bVal = new Date(bVal).getTime() || 0;
      } else {
        aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  // dashboard stats
  const totalDocs = documents.length;
  const uniqueTypes = new Set(documents.map((d) => d.document_type)).size;
  const uniqueCommissions = new Set(documents.map((d) => d.commission)).size;
  const currentYearCount = documents.filter((d) => String(d.year) === String(new Date().getFullYear())).length;

  return (
    <>
      <div className="flex w-full min-h-screen bg-gray-100">
        <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
          <Sidebar />
        </div>
        <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Minutes</h1>
            </div>

            {/* Dashboard stat bar */}
            <div className="mb-6">
              <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center justify-around gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{totalDocs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-gray-600">Types:</span>
                  <span className="font-bold text-gray-800">{uniqueTypes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span className="text-gray-600">Commissions:</span>
                  <span className="font-bold text-gray-800">{uniqueCommissions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">This Year:</span>
                  <span className="font-bold text-gray-800">{currentYearCount}</span>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {success && (
              <div className="mb-4 px-4 py-2 rounded bg-green-100 text-green-700">✅ {successMessage}</div>
            )}
            {error && (
              <div className="mb-4 px-4 py-2 rounded bg-red-100 text-red-700">❌ {error}</div>
            )}

            {/* Toolbar with Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                {!showAddForm && canManage && (
                  <button
                    onClick={() => { resetForm(); setShowAddForm(true); closeEditForm(); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white border rounded-md text-xs font-medium hover:bg-blue-700 transition"
                  >
                    <Plus size={14} /> Add Document
                  </button>
                )}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search (type, commission, subject)..."
                  className="w-full sm:w-64 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                  <Filter size={16} className="text-gray-400" /> Filters:
                </div>
                <select name="documentType" value={filters.documentType} onChange={handleFilterChange}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition">
                  <option value="">All Types</option>
                  {dropdowns.documentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <select name="commission" value={filters.commission} onChange={handleFilterChange}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition">
                  <option value="">All Commissions</option>
                  {dropdowns.commissions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select name="year" value={filters.year} onChange={handleFilterChange}
                  className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition">
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {(search || filters.documentType || filters.commission || filters.year) && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5" title="Clear all filters">
                    <RefreshCw size={14} /> Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
                <span>Show</span>
                <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1 outline-none">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
                <span className="font-medium text-gray-800">{filtered.length} records</span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">S/N</th>
                    <th onClick={() => handleSort("display_order")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Order {getSortIcon("display_order")}</th>
                    <th onClick={() => handleSort("date")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Date of Meeting {getSortIcon("date")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Commission / Year</th>
                    <th onClick={() => handleSort("subject")} className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">Subject {getSortIcon("subject")}</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Document</th>
                    <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* GLOBAL ADD FORM ROW */}
                  {showAddForm && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="p-4 border-b">
                        <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                          <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>
                          <div className="flex justify-between mb-4 items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                              <Plus size={18} className="text-blue-600" /> Upload New Minutes
                            </h2>
                            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                          </div>
                          <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Display Order</label>
                                <input type="number" name="display_order" value={formData.display_order} onChange={handleChange}
                                  placeholder="e.g., 1, 2, 3..." className="w-full border rounded px-3 py-2" min="1" />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Document Type *</label>
                                <select name="document_type" value={formData.document_type} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                                  {dropdowns.documentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Commission *</label>
                                <select name="commission" value={formData.commission} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                                  {dropdowns.commissions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Year *</label>
                                <select name="year" value={formData.year} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Date *</label>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium">Subject *</label>
                                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Brief description" className="w-full border rounded px-3 py-2" required />
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="text-sm font-medium">Upload File (PDF, DOC, DOCX) * — Max 50MB</label>
                              <input id="fileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full border rounded px-3 py-2 mt-1" required />
                              {formData.file && (
                                <p className="text-sm text-gray-500 mt-1">Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                              )}
                            </div>
                            <div className="flex justify-end gap-3 mt-5">
                              <button type="button" onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                                <Save size={16} /> {loading ? "Uploading..." : "Upload Minutes"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}

                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-6 text-gray-500">Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-6 text-gray-500">No documents found</td></tr>
                  ) : (
                    paginated.map((doc, index) => {
                      const isExpanded = expandedRows.has(doc.id);
                      const isEditing = editingId === doc.id;
                      const rowSNumber = startIndex + index + 1;

                      return (
                        <Fragment key={doc.id}>
                          <tr
                            className={`hover:bg-gray-50 transition-colors align-top cursor-pointer ${isEditing ? "bg-blue-50" : ""}`}
                            onClick={(e) => {
                              if (isEditing) return;
                              if ((e.target).closest("button") || (e.target).closest("a")) return;
                              toggleRowExpand(doc.id);
                            }}
                          >
                            <td className="px-2 py-3 text-sm text-gray-500">{rowSNumber}</td>
                            <td className="px-2 py-3 text-sm whitespace-nowrap">{doc.display_order || "—"}</td>
                            <td className="px-2 py-3 text-sm whitespace-nowrap">{formatDate(doc.date)}</td>
                            <td className="px-2 py-3 text-sm">
                              <span className="font-medium">{doc.commission}</span>
                              <span className="text-gray-400"> / </span>
                              <span>{doc.year}</span>
                            </td>
                            <td className="px-2 py-3 text-sm">
                              <div className="max-w-[200px] lg:max-w-[280px]">
                                <span className="text-gray-600 line-clamp-2">{doc.subject}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openViewer(doc)} className="text-blue-600 hover:text-blue-800 transition" title="View document"><ViewIcon size={16} /></button>
                                <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:text-blue-800 transition" title="Download file"><Download size={16} /></button>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-sm">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  onClick={() => toggleRowExpand(doc.id)}
                                  className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : ""}`}
                                >
                                  <ChevronDown size={12} className={isExpanded ? "rotate-180" : ""} />
                                  {isExpanded ? "Hide" : "View"}
                                </button>
                                {canManage && (
                                  <button onClick={() => openEditForm(doc)}
                                    className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black ${isEditing ? "bg-blue-100 border-blue-400 text-blue-800" : ""}`}>
                                    <Pencil size={12} /> Edit
                                  </button>
                                )}
                                {canManage && (
                                  <button onClick={() => handleDelete(doc.id)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black text-red-500">
                                    <Trash2 size={12} /> Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* INLINE EDIT FORM */}
                          {isEditing && (
                            <tr>
                              <td colSpan={7} className="p-4 bg-gray-50 border-b border-gray-200">
                                <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                                  <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>
                                  <div className="flex justify-between mb-4 items-center">
                                    <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                      <Pencil size={18} /> Edit Document
                                    </h2>
                                    <button onClick={closeEditForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                                  </div>

                                  {editFormError && (
                                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">❌ {editFormError}</div>
                                  )}

                                  <form onSubmit={handleEditSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Display Order</label>
                                        <input type="number" name="display_order" value={editFormData.display_order} onChange={handleEditChange} className="w-full border rounded px-3 py-2" min="1" placeholder="e.g., 1, 2, 3..." />
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Document Type *</label>
                                        <select name="document_type" value={editFormData.document_type} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                          {dropdowns.documentTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Commission *</label>
                                        <select name="commission" value={editFormData.commission} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                          {dropdowns.commissions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Year *</label>
                                        <select name="year" value={editFormData.year} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Date *</label>
                                        <input type="date" name="date" value={editFormData.date} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Subject *</label>
                                        <input type="text" name="subject" value={editFormData.subject} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
                                      </div>
                                    </div>

                                    <div className="mt-4">
                                      <label className="text-sm font-medium">Replace File (optional) — Max 50MB</label>
                                      <input id="editFileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border rounded px-3 py-2 mt-1" />
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {editExistingFile && !editRemoveExisting && !editFormData.file && (
                                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm border border-blue-200">
                                            <FileText size={14} />
                                            <span className="max-w-xs truncate">{editExistingFile.name}</span>
                                            <button type="button" onClick={removeEditExistingFile} className="text-blue-700 hover:text-red-600 transition"><X size={16} /></button>
                                          </div>
                                        )}
                                        {editFormData.file && (
                                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-200">
                                            <FileText size={14} />
                                            <span className="max-w-xs truncate">{editFormData.file.name}</span>
                                            <button type="button" onClick={removeEditSelectedFile} className="text-green-700 hover:text-red-600 transition"><X size={16} /></button>
                                          </div>
                                        )}
                                        {!editExistingFile && !editFormData.file && editRemoveExisting && (
                                          <span className="text-sm text-red-500">⚠️ File removed – upload a new one</span>
                                        )}
                                        {!editExistingFile && !editFormData.file && !editRemoveExisting && (
                                          <span className="text-sm text-gray-400">No file selected (keep current)</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-5">
                                      <button type="button" onClick={closeEditForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                                      <button type="submit" disabled={editFormLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                                        <Check size={16} /> {editFormLoading ? "Updating..." : "Save Changes"}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* INLINE VIEW DETAILS (UPDATED TO MATCH SCREENSHOT) */}
                          {isExpanded && !isEditing && (
                            <tr>
                              <td colSpan={7} className="p-4 bg-gray-50/80">
                                <div className="mx-auto bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                  
                                  {/* Top Action Bar */}
                                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 px-6 py-4 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-800">Document Details</h4>
                                      <p className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-700">Document Type:</span> {doc.document_type}
                                      </p>
                                    </div>
                                    
                                    {/* Buttons grouped to the right */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                      <button onClick={() => openViewer(doc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-50 transition shadow-sm">
                                        <ViewIcon size={14} /> View
                                      </button>
                                      <button onClick={() => handleDownload(doc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-50 transition shadow-sm">
                                        <Download size={14} /> Download
                                      </button>
                                      {canManage && (
                                        <>
                                          <button onClick={() => openEditForm(doc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-xs font-medium hover:bg-yellow-100 transition shadow-sm">
                                            <Pencil size={14} /> Edit
                                          </button>
                                          <button onClick={() => handleDelete(doc.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-medium hover:bg-red-100 transition shadow-sm">
                                            <Trash2 size={14} /> Delete
                                          </button>
                                          <button onClick={() => setSendDocId(doc.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-600 rounded-md text-xs font-medium hover:bg-indigo-700 transition shadow-sm">
                                            <Send size={14} /> Send Notification (new)
                                          </button>
                                        </>
                                      )}
                                      <button onClick={() => toggleRowExpand(doc.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 transition shadow-sm">
                                        <X size={14} /> Close
                                      </button>
                                    </div>
                                  </div>

                                  {/* Bottom Details Section */}
                                  <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                      <div className="flex items-start gap-3">
                                        <Hash size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Display Order</p>
                                          <p className="text-sm text-gray-800">{doc.display_order || "—"}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <Calendar size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</p>
                                          <p className="text-sm text-gray-800">{formatDate(doc.date)}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <FileText size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Document Type</p>
                                          <p className="text-sm text-gray-800">{doc.document_type}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <Users size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Commission</p>
                                          <p className="text-sm text-gray-800">{doc.commission}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <Calendar size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Year</p>
                                          <p className="text-sm text-gray-800">{doc.year}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3 md:col-span-2">
                                        <FileText size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                                          <p className="text-sm text-gray-800">{doc.subject}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3 md:col-span-2">
                                        <File size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">File</p>
                                          <button onClick={() => openViewer(doc)} className="text-sm text-blue-600 hover:underline flex items-center gap-1.5">
                                            <ViewIcon size={14} />
                                            {doc.file_url.split("/").pop()}
                                          </button>
                                          {doc.original_filename && (
                                            <p className="text-xs text-gray-400 mt-1">Original: {doc.original_filename}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
                <div>
                  Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, sorted.length)}</span> of{" "}
                  <span className="font-semibold text-gray-800">{sorted.length}</span> records
                </div>
                <div className="flex items-center gap-4">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors">&lt;</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}
                    className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors">&gt;</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Send Notification Modal */}
      {sendDocId && (
        <SendNotificationModal
          docId={sendDocId}
          onClose={() => setSendDocId(null)}
          onSent={() => setSendDocId(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      {showViewerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeViewer}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}