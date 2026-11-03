"use client";

import React, { useState, useEffect, ChangeEvent, Fragment } from "react";
import {
  Plus, X, Check, Pencil, Trash2, ChevronDown, Filter, RefreshCw, Save, Eye, AlertCircle, Loader2
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
    fetchData(); // Fetch bugs from DB on mount

    async function fetchProfile() {
      const token = localStorage.getItem("token");
      if (!token) {
        // Fallback for testing/development
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
    setEditData(null);
    setShowForm(false);
  };

  // ================== ADD / UPDATE (DB SAVE) ==================
  const handleAddOrUpdate = async () => {
    if (!formData.module || !formData.description) {
      showNotification("Module and Description are required", "error");
      return;
    }

    if (editData) {
      // UPDATE IN DB
      const updatedRow = { 
        ...editData, 
        ...formData,
        resolvedAt: isAdmin && formData.comments !== editData.comments ? new Date().toLocaleString() : editData.resolvedAt
      };
      
      try {
        const res = await fetch(`/api/feedback/${editData._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedRow),
        });
        if (res.ok) {
          setData(prev => prev.map(row => row._id === editData._id ? updatedRow : row));
          showNotification("Feedback updated successfully");
          resetForm();
        } else {
          showNotification("Failed to update in DB", "error");
        }
      } catch (err) {
        showNotification("Error updating record", "error");
      }

    } else {
      // CREATE IN DB
      const newRow = {
        bugId: `BUG-${data.length + 100}`, 
        loggedAt: new Date().toLocaleString(),
        reportedBy: currentUser.name,
        ...formData,
        rootCause: "", 
        comments: "",  
      };

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRow),
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

  // UI Helpers for Status Colors
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
      
      {/* Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Flag Feedback & Bug Tracking</h1>
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

          {/* ====== DASHBOARD CARDS ====== */}
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

          {/* Notification */}
          {notification && (
            <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {notification.message}
            </div>
          )}

          {/* Toolbar with Filters */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              
              {/* Search */}
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

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Clear Filters Button */}
              {(search || filterCategory || filterStatus) && (
                <button 
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                >
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>

            {/* Records Counter */}
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

          {/* Table Container */}
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
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">Comments</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm">
                
                {/* GLOBAL ADD FORM (User Reporting) */}
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
                          
                          {/* ADMIN ONLY FIELDS (Hidden for normal user reporting) */}
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

                {/* DATA ROWS */}
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
                      {/* MAIN ROW */}
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
                        
                        <td className="px-3 py-3 text-gray-600 text-xs max-w-[150px] truncate" title={row.comments}>
                          {row.comments || "-"}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => toggleRowExpand(row._id)}
                              className={`flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition ${isExpanded ? "bg-blue-50 text-blue-600 border-blue-300" : ""}`}
                            >
                              {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            
                            {/* ONLY ADMINS CAN EDIT OR DELETE */}
                            {isAdmin && (
                              <>
                                <button onClick={() => {
                                  setEditData(row);
                                  setFormData({
                                    module: row.module, category: row.category, description: row.description, impact: row.impact, status: row.status, rootCause: row.rootCause, comments: row.comments
                                  });
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
                                
                                {/* ADMIN ONLY FIELDS IN EDIT MODE */}
                                {isAdmin ? (
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
                                ) : (
                                  <div>
                                    <label className="text-sm font-medium">Status *</label>
                                    <select name="status" value={formData.status} onChange={handleFormChange} className="w-full border rounded px-3 py-2">
                                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
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

                                            {/* INLINE VIEW DETAILS - STACKED ROW DESIGN */}
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
                                      
                                      {/* Timestamp neatly at the bottom of the comment box */}
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