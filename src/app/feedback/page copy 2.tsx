"use client";

import React, { useState, useEffect, ChangeEvent, Fragment } from "react";
import {
  Plus, X, Check, Pencil, Trash2, ChevronDown, Filter, RefreshCw, Save, Eye, AlertCircle, Loader2,
  Upload, FileText, Download
} from "lucide-react";
import Sidebar from "@/components/Sidebar"; // Adjust path if needed

// ==================== TYPES ====================
type FeedbackRow = {
  _id: string;
  bugId: string;
  loggedAt: string;
  reportedBy: string;
  module: string;
  category: string;
  description: string;
  impact: "High" | "Medium" | "Low" | "Critical";
  status: "Resolved" | "Pending" | "Unresolved" | "In-Progress";
  rootCause: string;
  comments: string;
  resolvedAt?: string; 
  attachments?: string[]; 
};

type FormData = {
  module: string;
  category: string;
  description: string;
  impact: "High" | "Medium" | "Low" | "Critical";
  status: "Resolved" | "Pending" | "Unresolved" | "In-Progress";
  rootCause: string;
  comments: string;
};

// Dropdown Options
const MODULES = ["Leave", "Biometric", "HRC", "Minutes", "Weekly plan", "Secretariat Services", "Room Booking module", "E-sign"];
const CATEGORIES = ["Functional", "UI/UX", "Performance", "Data Error"];
const IMPACTS = ["Low", "Medium", "High", "Critical"] as const;
const STATUSES = ["Pending", "In-Progress", "Resolved", "Unresolved"] as const;
const ROOT_CAUSES = ["Unclear Requirement", "Design Flaw", "Configuration Issue", "Bug in Code", "Third-party API", "New feature"];

// Admin Emails List
const ADMIN_EMAILS = ["kingarinzin@acc.org.bt", "tshewangl@tech.gov.bt", "samtenw@tech.gov.bt"];

export default function FeedbackPage() {
  const [data, setData] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<FeedbackRow | null>(null);
  
  // Search & Filter States
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Inline expansion states
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Auth/User State
  const [currentUser, setCurrentUser] = useState({ name: "Loading...", email: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  // Attachment States
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    module: "", 
    category: "Functional", 
    description: "", 
    impact: "Medium", 
    status: "Pending", 
    rootCause: "", 
    comments: ""
  });

  // ================== DB FETCH ==================
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const dbData = await res.json();
        setData(dbData);
      }
    } catch (err) {
      console.error("Failed to fetch DB data", err);
      showNotification("Failed to load data from database", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ================== AUTH / ROLE ==================
  useEffect(() => {
    fetchData(); 

    async function fetchProfile() {
      const token = localStorage.getItem("token");
      if (!token) {
        const mockEmail = "kingarinzin@acc.org.bt"; 
        setCurrentUser({ name: "Test User", email: mockEmail });
        setIsAdmin(ADMIN_EMAILS.includes(mockEmail));
        return;
      }
      
      try {
        const res = await fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUser({ name: profile.name || "Unknown User", email: profile.email || "" });
          setIsAdmin(ADMIN_EMAILS.includes(profile.email)); 
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setCurrentUser({ name: "Unknown User", email: "" });
        setIsAdmin(false);
      }
    }
    fetchProfile();
  }, []);

  // ================== NOTIFICATION ==================
  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================== FILE HANDLERS ==================
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = async (fileName: string) => {
    if (!editData) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/feedback/delete-file", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feedbackId: editData._id, fileName }),
      });
      if (!res.ok) throw new Error("Failed to delete file");
      setExistingAttachments(prev => prev.filter(f => f !== fileName));
      showNotification("File deleted successfully");
      await fetchData();
    } catch (error) {
      showNotification((error as Error).message, "error");
    }
  };

  const handleViewFile = (fileName: string) => {
    window.open(`/uploads/feedback/${fileName}`, "_blank");
  };

  const handleDownloadFile = (fileName: string) => {
    const link = document.createElement("a");
    link.href = `/uploads/feedback/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== FORM HANDLERS ==================
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ 
      module: "", 
      category: "Functional", 
      description: "", 
      impact: "Medium", 
      status: "Pending", 
      rootCause: "", 
      comments: "" 
    });
    setAttachments([]);
    setExistingAttachments([]);
    setEditData(null);
    setShowForm(false);
  };

  // ================== ADD / UPDATE (DB SAVE) ==================
  const handleAddOrUpdate = async () => {
    if (!formData.module || !formData.description) {
      showNotification("Module and Description are required", "error");
      return;
    }

    const body = new FormData();
    
    Object.keys(formData).forEach((key) => {
      body.append(key, formData[key as keyof FormData]);
    });

    attachments.forEach(file => body.append("attachments", file));
    
    if (editData) {
      body.append("_id", editData._id);
      if (existingAttachments.length > 0) {
        body.append("existingAttachments", JSON.stringify(existingAttachments));
      }
      
      const updatedRow = { 
        ...editData, 
        ...formData,
        resolvedAt: isAdmin && formData.comments !== editData.comments ? new Date().toLocaleString() : editData.resolvedAt
      };

      try {
        const res = await fetch(`/api/feedback/${editData._id}`, {
          method: "PUT",
          body: body, 
        });
        if (res.ok) {
          setData(prev => prev.map(row => row._id === editData._id ? { ...updatedRow, attachments: existingAttachments } : row));
          showNotification("Feedback updated successfully");
          resetForm();
        } else {
          showNotification("Failed to update in DB", "error");
        }
      } catch (err) {
        showNotification("Error updating record", "error");
      }

    } else {
      body.append("bugId", `BUG-${data.length + 100}`);
      body.append("loggedAt", new Date().toLocaleString());
      body.append("reportedBy", currentUser.name);
      body.append("rootCause", "");
      body.append("comments", "");

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          body: body, 
        });
        if (res.ok) {
          const savedRow = await res.json();
          setData([savedRow, ...data]);
          showNotification("Feedback submitted successfully");
          resetForm();
        } else {
          showNotification("Failed to save to DB", "error");
        }
      } catch (err) {
        showNotification("Error saving record", "error");
      }
    }
  };

  // ================== DELETE (DB DELETE) ==================
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(prev => prev.filter(row => row._id !== id));
        showNotification("Record deleted successfully");
      } else {
        showNotification("Failed to delete from DB", "error");
      }
    } catch (err) {
      showNotification("Error deleting record", "error");
    }
  };

  // ================== TOGGLE INLINE EXPAND ==================
  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ================== DASHBOARD COMPUTATIONS ==================
  const total = data.length;
  const pendingCount = data.filter(r => r.status === "Pending").length;
  const inProgressCount = data.filter(r => r.status === "In-Progress").length;
  const resolvedCount = data.filter(r => r.status === "Resolved").length;

  // ================== FILTER & SORT LOGIC ==================
  const filteredData = data.filter((item) => {
    const matchesSearch = 
      (item.bugId?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.reportedBy?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.description?.toLowerCase() || "").includes(search.toLowerCase());
      
    const matchesCategory = filterCategory === "" || item.category === filterCategory;
    const matchesStatus = filterStatus === "" || item.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleClearFilters = () => {
    setSearch(""); setFilterCategory(""); setFilterStatus(""); setCurrentPage(1);
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-green-100 text-green-800 border-green-200";
      case "Pending": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Unresolved": return "bg-red-100 text-red-800 border-red-200";
      case "In-Progress": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getImpactPill = (impact: string) => {
    switch (impact) {
      case "High": return "bg-red-50 text-red-600";
      case "Medium": return "bg-yellow-50 text-yellow-600";
      case "Low": return "bg-blue-50 text-blue-600";
      case "Critical": return "bg-red-100 text-red-800 font-bold";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-gray-100">
      
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl hidden lg:block">
        <Sidebar />
      </div>
      
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Feedback & Bug Tracker</h1>
              <p className="text-sm text-gray-500 mt-1">Monitor system issues, track feedback, and assign resolutions.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition shadow-sm"
              >
                <Plus size={16} /> Report Bug
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Total Issues</p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-3xl font-bold text-gray-900">{total}</h2>
                <span className="text-xs text-green-600 font-medium mb-1">+12% this week</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Pending</p>
              <h2 className="text-3xl font-bold text-orange-600 mt-1">{pendingCount}</h2>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">In-Progress</p>
              <h2 className="text-3xl font-bold text-blue-600 mt-1">{inProgressCount}</h2>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Resolved</p>
              <h2 className="text-3xl font-bold text-green-600 mt-1">{resolvedCount}</h2>
            </div>
          </div>

          {notification && (
            <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {notification.message}
            </div>
          )}

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search ID, user, description..."
                className="w-full sm:w-64 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-black outline-none"
              />
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                <Filter size={16} className="text-gray-400" /> Filters:
              </div>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {(search || filterCategory || filterStatus) && (
                <button 
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                >
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
              <span>Show</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 outline-none">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="font-medium text-gray-800">{filteredData.length} records</span>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-[1300px] w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Bug ID</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Logged Date</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Reported By</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Module</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Category</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Issue Description</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Impact</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Root Cause</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px]">Attachments</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm">
                
                {/* GLOBAL ADD FORM */}
                {showForm && !editData && (
                  <tr className="bg-gray-50">
                    <td colSpan={11} className="p-4 border-b">
                      <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>

                        <div className="flex justify-between mb-4 items-center">
                          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <AlertCircle size={18} className="text-orange-500"/> Flag an Issue / Feedback
                          </h2>
                          <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium">Reported By (Auto)</label>
                            <input type="text" disabled value={currentUser.name} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Module *</label>
                            <select name="module" value={formData.module} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                              <option value="">Select Module</option>
                              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Category *</label>
                            <select name="category" value={formData.category} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="lg:col-span-2">
                            <label className="text-sm font-medium">Issue Description *</label>
                            <input type="text" name="description" value={formData.description} onChange={handleFormChange} placeholder="Describe the issue..." className="w-full border rounded px-3 py-2" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Impact *</label>
                            <select name="impact" value={formData.impact} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                              {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </div>
                          
                          {isAdmin && (
                            <>
                              <div>
                                <label className="text-sm font-medium">Status *</label>
                                <select name="status" value={formData.status} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Root Cause</label>
                                <select name="rootCause" value={formData.rootCause} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                  <option value="">Select Root Cause</option>
                                  {ROOT_CAUSES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              </div>
                              <div className="lg:col-span-3">
                                <label className="text-sm font-medium">Comments / Resolution</label>
                                <textarea name="comments" value={formData.comments} onChange={handleFormChange} rows={2} className="w-full border rounded px-3 py-2 resize-none"></textarea>
                              </div>
                            </>
                          )}
                        </div>

                        {/* FILE UPLOAD */}
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium">Attach Files / Screenshots (optional)</label>
                            <label className="cursor-pointer text-blue-600 hover:text-blue-800 transition">
                              <Upload size={16} />
                              <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                            </label>
                          </div>
                          {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-100">
                                  <FileText size={16} className="text-blue-600" />
                                  <span>{file.name}</span>
                                  <button onClick={() => handleRemoveFile(idx)} className="text-blue-500 hover:text-blue-800 transition ml-1">
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                          <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                          <button onClick={handleAddOrUpdate} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition shadow-sm">
                            <Save size={16} /> Submit Report
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={24} />
                      Loading records from database...
                    </td>
                  </tr>
                ) : paginatedData.map((row) => {
                  const isExpanded = expandedRows.has(row._id);
                  const isEditing = showForm && editData?._id === row._id;

                  return (
                    <Fragment key={row._id}>
                      <tr 
                        className={`hover:bg-gray-50 transition-colors align-top cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                        onClick={(e) => {
                          if (isEditing) return; 
                          if ((e.target as HTMLElement).closest('button')) return;
                          toggleRowExpand(row._id);
                        }}
                      >
                        <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.bugId}</td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.loggedAt}</td>
                        <td className="px-3 py-3 text-gray-800 whitespace-nowrap">{row.reportedBy}</td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.module}</td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.category}</td>
                        
                        <td className="px-3 py-3 text-gray-600 text-xs max-w-[200px] truncate" title={row.description}>
                          {row.description}
                        </td>
                        
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getImpactPill(row.impact)}`}>
                            {row.impact}
                          </span>
                        </td>
                        
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusPill(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {row.rootCause || "-"}
                        </td>
                        
                        <td className="px-3 py-3 text-gray-600 text-xs">
                          {row.attachments && row.attachments.length > 0 ? (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded w-fit">
                              <FileText size={12} className="text-gray-500" />
                              <span className="font-medium">{row.attachments.length} file(s)</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>

                        {/* ACTIONS COLUMN */}
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => toggleRowExpand(row._id)}
                              className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : ""}`}
                            >
                              {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            
                            {(isAdmin || row.status === "Pending") && (
                              <>
                                <button onClick={() => {
                                  setEditData(row);
                                  setFormData({
                                    module: row.module, 
                                    category: row.category, 
                                    description: row.description, 
                                    impact: row.impact, 
                                    status: row.status, 
                                    rootCause: row.rootCause, 
                                    comments: row.comments
                                  });
                                  setExistingAttachments(row.attachments || []);
                                  setAttachments([]);
                                  setShowForm(true);
                                }} className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black ${isEditing ? 'bg-blue-100 border-blue-400 text-blue-800' : ''}`}>
                                  <Pencil size={12} /> Edit
                                </button>
                                
                                <button onClick={() => handleDelete(row._id)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black text-red-500">
                                  <Trash2 size={12} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* INLINE EDIT FORM */}
                      {isEditing && (
                        <tr>
                          <td colSpan={11} className="p-4 bg-gray-50 border-b border-gray-200">
                            <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                              <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>
                              
                              <div className="flex justify-between mb-4 items-center">
                                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                  <Pencil size={18} /> Edit Issue: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">{row.bugId}</span>
                                </h2>
                                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Reported By</label>
                                  <input type="text" disabled value={row.reportedBy} className="w-full border rounded px-3 py-2 bg-gray-200 text-gray-600" />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Module *</label>
                                  <select name="module" value={formData.module} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Category *</label>
                                  <select name="category" value={formData.category} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div className="lg:col-span-2">
                                  <label className="text-sm font-medium">Issue Description *</label>
                                  <input type="text" name="description" value={formData.description} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Impact *</label>
                                  <select name="impact" value={formData.impact} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                    {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                                  </select>
                                </div>
                                
                                {isAdmin && (
                                  <>
                                    <div>
                                      <label className="text-sm font-medium">Status *</label>
                                      <select name="status" value={formData.status} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Root Cause</label>
                                      <select name="rootCause" value={formData.rootCause} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                        <option value="">Select Root Cause</option>
                                        {ROOT_CAUSES.map(r => <option key={r} value={r}>{r}</option>)}
                                      </select>
                                    </div>
                                    <div className="lg:col-span-3">
                                      <label className="text-sm font-medium">Comments / Resolution</label>
                                      <textarea name="comments" value={formData.comments} onChange={handleFormChange} rows={2} className="w-full border rounded px-3 py-2 resize-none"></textarea>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* FILE UPLOAD FOR EDITING */}
                              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-bold text-gray-700">Attachments</label>
                                  <label className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                    <Upload size={16} />
                                    Upload New File
                                    <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                                  </label>
                                </div>
                                
                                {/* Existing Attachments (Can be deleted) */}
                                {existingAttachments.length > 0 ? ( <div className="flex flex-wrap gap-2 mt-3">
                                    {existingAttachments.map((fileName, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-white text-gray-800 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 shadow-sm">
                                        <FileText size={16} className="text-blue-500" />
                                        <span className="max-w-[200px] truncate">{fileName}</span>
                                        <div className="flex items-center ml-2 border-l pl-2 border-gray-300 gap-1">
                                          <button type="button" onClick={() => handleViewFile(fileName)} className="text-blue-500 hover:text-blue-700" title="View">
                                            <Eye size={16} />
                                          </button>
                                          <button type="button" onClick={() => handleRemoveExistingFile(fileName)} className="text-red-500 hover:text-red-700" title="Delete">
                                            <X size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 italic mt-1">No existing attachments.</p>
                                )}
                                
                                {/* New Attachments (Before save) */}
                                {attachments.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Files to be uploaded:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-200">
                                          <FileText size={16} className="text-blue-600" />
                                          <span>{file.name}</span>
                                          <button type="button" onClick={() => handleRemoveFile(idx)} className="text-blue-500 hover:text-red-600 transition ml-1">
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end gap-3 mt-5">
                                <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 transition"><X size={16} /> Cancel</button>
                                <button onClick={handleAddOrUpdate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                                  <Check size={16} /> Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* INLINE VIEW DETAILS */}
                      {isExpanded && !isEditing && (
                        <tr>
                          <td colSpan={11} className="p-6 bg-gray-50 border-b border-gray-200 shadow-inner">
                            <div className="max-w-6xl mx-auto space-y-6">
                              
                              {/* 1. FULL DESCRIPTION ROW */}
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <AlertCircle size={14} className="text-blue-500" /> Full Description
                                </label>
                                <div className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-200 whitespace-pre-wrap shadow-sm">
                                  {row.description}
                                </div>
                              </div>

                              {/* 2. ROOT CAUSE ROW */}
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Filter size={14} className="text-orange-500" /> Root Cause
                                </label>
                                <div className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                                  {row.rootCause ? (
                                    <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 font-medium px-3 py-1.5 rounded-md text-sm border border-orange-100">
                                      {row.rootCause}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Not identified yet</span>
                                  )}
                                </div>
                              </div>

                              {/* 3. RESOLUTION / COMMENTS ROW */}
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Check size={14} className="text-green-500" /> Resolution / Comments
                                </label>
                                <div className="text-sm text-gray-700 bg-white p-4 rounded-md border border-gray-200 relative shadow-sm">
                                  {row.comments ? (
                                    <>
                                      <p className="whitespace-pre-wrap mb-4">{row.comments}</p>
                                      {row.resolvedAt && (
                                        <div className="pt-3 border-t border-gray-200 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                          <Check size={14} /> Admin updated on {row.resolvedAt}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 italic">No comments added yet</span>
                                  )}
                                </div>
                              </div>

                              {/* 4. ATTACHMENTS ROW */}
                              {row.attachments && row.attachments.length > 0 && (
                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText size={14} className="text-gray-500" /> Attachments
                                  </label>
                                  <div className="flex flex-wrap gap-3">
                                    {row.attachments.map((file, i) => (
                                      <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                        <FileText size={16} className="text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file}</span>
                                        <div className="flex items-center gap-1 border-l pl-2 ml-1">
                                          <button onClick={() => handleViewFile(file)} className="text-blue-500 hover:text-blue-700 p-1" title="View">
                                            <Eye size={16} />
                                          </button>
                                          <button onClick={() => handleDownloadFile(file)} className="text-green-500 hover:text-green-700 p-1" title="Download">
                                            <Download size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                
                {!isLoading && paginatedData.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-6 text-gray-500">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-5 text-sm text-gray-600">
              <div>
                Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredData.length)}</span> of <span className="font-semibold text-gray-800">{filteredData.length}</span> records
              </div>
              <div className="flex items-center gap-4">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  &lt;
                </button>
                <span>Page {currentPage} of {totalPages}</span>
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
                                 