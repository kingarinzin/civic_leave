"use client";

import React, { useState, useEffect } from "react";
import { 
  Trash2, Pencil, Save, Check, X, Plus, Loader2, Filter, RefreshCw, 
  ChevronDown, ChevronUp, FileText, Eye 
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProgramTitlePage() {
  const [items, setItems] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [masterCostTypes, setMasterCostTypes] = useState([]); // Program Cost Master List
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── EXPANDABLE ROW STATES ─────────────────────────
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [expandedCosts, setExpandedCosts] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [isAddingCost, setIsAddingCost] = useState(false);
  
  // Mini-form state for adding costs
  const [costFormData, setCostFormData] = useState({
    programCostType: "",
    totalAmount: "",
    remarks: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    locationCategory: "Ex-Country",
    trainingGroup: "STT - Short Term Training",
    trainingType: "",
  });

  const getShortTrainingGroup = (fullLabel) => {
    if (fullLabel?.startsWith("STT")) return "STT";
    if (fullLabel?.startsWith("LTT")) return "LTT";
    return fullLabel;
  };

  // ─── FETCHES ───────────────────────────────────────
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/hr/program-title");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Program Catalogue", "error");
    }
  };

  const fetchTrainingTypes = async () => {
    try {
      const res = await fetch("/api/hr/training-type");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTrainingTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMasterCostTypes = async () => {
    try {
      const res = await fetch("/api/hr/program-cost");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMasterCostTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTrainingTypes();
    fetchMasterCostTypes();
  }, []);

  // ─── EXPAND ROW & FETCH COSTS ──────────────────────
  const toggleRowExpand = async (id) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
      return;
    }
    
    setExpandedRowId(id);
    setLoadingCosts(true);
    setExpandedCosts([]);
    
    try {
      const res = await fetch(`/api/hr/program-cost/program/${id}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedCosts(data);
      }
    } catch (error) {
      console.error("Failed to load program costs", error);
    } finally {
      setLoadingCosts(false);
    }
  };

  // ─── ADD COST TO PROGRAM ───────────────────────────
  const handleAddCost = async () => {
    if (!costFormData.programCostType || !costFormData.totalAmount) {
      showNotification("Cost Type and Amount are required", "error");
      return;
    }

    setIsAddingCost(true);
    try {
      const res = await fetch(`/api/hr/program-cost/program/${expandedRowId}`, {
        method: "POST",
        body: JSON.stringify(costFormData),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add cost");

      // Refresh the expanded costs list
      setExpandedCosts((prev) => [...prev, data]);
      setCostFormData({ programCostType: "", totalAmount: "", remarks: "" });
      showNotification("Cost added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsAddingCost(false);
    }
  };

  const handleDeleteCost = async (costId) => {
    if (!confirm("Are you sure you want to delete this cost?")) return;
    try {
      // NOTE: You'll need a standard DELETE API route for ProgramCost by ID if you don't have one, 
      // but for now we'll assume the base /api/hr/program-cost DELETE route handles it.
      const res = await fetch(`/api/hr/program-cost`, {
        method: "DELETE",
        body: JSON.stringify({ _id: costId }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) throw new Error("Failed to delete cost");
      
      setExpandedCosts((prev) => prev.filter((c) => c._id !== costId));
      showNotification("Cost deleted", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  // ─── MAIN CRUD HANDLERS ────────────────────────────
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
    if (!formData.title.trim() || !formData.trainingType) {
      showNotification("Title and Training Type are required", "error");
      return;
    }
    setIsSubmitting(true); 
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to add");
      await fetchItems(); 
      resetForm();
      showNotification("Course added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsSubmitting(false); 
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
    setShowForm(false);
  };

  const handleUpdate = async () => {
    setIsSubmitting(true); 
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "PUT",
        body: JSON.stringify({ _id: editData._id, ...formData }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchItems(); 
      resetForm();
      showNotification("Course updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const res = await fetch("/api/hr/program-title", {
        method: "DELETE",
        body: JSON.stringify({ _id: item._id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete");
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

  // ─── FILTERING & SORTING ───────────────────────────
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filtered = items.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      (item.title?.toLowerCase() || "").includes(searchLower) ||
      (item.locationCategory?.toLowerCase() || "").includes(searchLower) ||
      (item.trainingGroup?.toLowerCase() || "").includes(searchLower) ||
      (item.trainingType?.trainingType?.toLowerCase() || "").includes(searchLower) ||
      (item.trainingId?.toLowerCase() || "").includes(searchLower)
    );
  });

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      if (sortConfig.key === "trainingType") {
        aVal = a.trainingType?.trainingType || "";
        bVal = b.trainingType?.trainingType || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  } else {
    sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "—";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // ─── RENDER ────────────────────────────────────────
  return (
    <div className="flex w-full min-h-screen bg-gray-100">
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-xl">
        <Sidebar />
      </div>

      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Program Catalogue</h1>
          </div>

          {notification && (
            <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {notification.message}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {!showForm && !editData && (
                <button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white border rounded-md text-xs font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={14} /> Add Course
                </button>
              )}
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search by any field..."
                className="w-full sm:w-64 px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                <Filter size={16} className="text-gray-400" /> Filters:
              </div>
              {search && (
                <button
                  onClick={() => { setSearch(""); setCurrentPage(1); }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5"
                >
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap text-gray-600">
              <span>Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border rounded px-2 py-1 outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={30}>30</option>
                <option value={35}>35</option>
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
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Training ID</th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Location</th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Group</th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Type</th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Course Title</th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                
                {/* ADD FORM */}
                {showForm && !editData && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="p-4 border-b">
                      <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>
                        <div className="flex justify-between mb-4 items-center">
                          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Plus size={18} className="text-blue-600"/> Create New Course
                          </h2>
                          <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Location *</label>
                            <select name="locationCategory" value={formData.locationCategory} onChange={(e) => setFormData({...formData, locationCategory: e.target.value})} className="w-full border rounded px-3 py-2">
                              <option value="Ex-Country">Ex-Country</option>
                              <option value="In-Country">In-Country</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Group *</label>
                            <select name="trainingGroup" value={formData.trainingGroup} onChange={(e) => setFormData({...formData, trainingGroup: e.target.value})} className="w-full border rounded px-3 py-2">
                              <option value="STT - Short Term Training">STT - Short Term Training</option>
                              <option value="LTT - Long Term Training">LTT - Long Term Training</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Type *</label>
                            <select name="trainingType" value={formData.trainingType} onChange={(e) => setFormData({...formData, trainingType: e.target.value})} className="w-full border rounded px-3 py-2">
                              <option value="">Select Type</option>
                              {trainingTypes.map(t => <option key={t._id} value={t._id}>{t.trainingType}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Title *</label>
                            <input name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border rounded px-3 py-2" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full border rounded px-3 py-2" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5">
                          <button onClick={resetForm} className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50">Cancel</button>
                          <button onClick={handleAdd} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                            {isSubmitting ? "Saving..." : "Save Course"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* DATA ROWS */}
                {paginated.map((item) => {
                  const isEditing = editData?._id === item._id;
                  const isExpanded = expandedRowId === item._id;

                  return (
                    <React.Fragment key={item._id}>
                      <tr className={`transition-colors align-top ${isEditing || isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                        <td className="px-2 py-3 text-sm whitespace-nowrap">
                          <button 
                            onClick={() => toggleRowExpand(item._id)}
                            className="text-blue-600 hover:underline font-mono font-medium flex items-center gap-1"
                          >
                            {item.trainingId || "—"}
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-sm">{item.locationCategory}</td>
                        <td className="px-2 py-3 text-sm">{getShortTrainingGroup(item.trainingGroup)}</td>
                        <td className="px-2 py-3 text-sm">{item.trainingType?.trainingType || "—"}</td>
                        <td className="px-2 py-3 text-sm font-medium text-gray-800">{item.title}</td>
                        <td className="px-2 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {!isEditing && (
                              <button onClick={() => handleEdit(item)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition">
                                <Pencil size={12} /> Edit
                              </button>
                            )}
                            <button onClick={() => handleDelete(item)} className="flex items-center gap-1 border rounded px-1.5 py-1 text-xs hover:border-black transition text-red-500">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EDIT FORM */}
                      {isEditing && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-gray-50 border-b border-gray-200">
                            <div className="bg-white rounded-lg shadow-sm p-6 pl-8 relative overflow-hidden">
                              <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-orange-400 rounded-full"></div>
                              <div className="flex justify-between mb-4 items-center">
                                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                  <Pencil size={18} /> Edit Course: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">{item.trainingId}</span>
                                </h2>
                                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Location</label>
                                  <select name="locationCategory" value={formData.locationCategory} onChange={(e) => setFormData({...formData, locationCategory: e.target.value})} className="w-full border rounded px-3 py-2">
                                    <option value="Ex-Country">Ex-Country</option>
                                    <option value="In-Country">In-Country</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Group</label>
                                  <select name="trainingGroup" value={formData.trainingGroup} onChange={(e) => setFormData({...formData, trainingGroup: e.target.value})} className="w-full border rounded px-3 py-2">
                                    <option value="STT - Short Term Training">STT - Short Term Training</option>
                                    <option value="LTT - Long Term Training">LTT - Long Term Training</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Type</label>
                                  <select name="trainingType" value={formData.trainingType} onChange={(e) => setFormData({...formData, trainingType: e.target.value})} className="w-full border rounded px-3 py-2">
                                    <option value="">Select Type</option>
                                    {trainingTypes.map(t => <option key={t._id} value={t._id}>{t.trainingType}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Title</label>
                                  <input name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-sm font-medium">Description</label>
                                  <textarea name="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full border rounded px-3 py-2" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-3 mt-5">
                                <button onClick={resetForm} className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50">Cancel</button>
                                <button onClick={handleUpdate} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                                  {isSubmitting ? "Updating..." : "Save Changes"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* EXPANDED COST ROW */}
                      {isExpanded && !isEditing && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-blue-50/50 border-b border-gray-200">
                            <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-5">
                              <h3 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <FileText size={18} className="text-blue-600" /> 
                                Expenses for: <span className="text-blue-600">{item.title}</span>
                              </h3>
                              
                              {loadingCosts ? (
                                <div className="flex justify-center py-4 text-gray-500"><Loader2 className="animate-spin" /></div>
                              ) : expandedCosts.length === 0 ? (
                                <p className="text-sm text-gray-500 py-3 italic">No costs added to this program yet.</p>
                              ) : (
                                <div className="overflow-x-auto mb-4 border rounded-lg">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {expandedCosts.map((cost) => (
                                        <tr key={cost._id}>
                                          <td className="px-4 py-2 text-sm font-medium">{cost.programCostType}</td>
                                          <td className="px-4 py-2 text-sm text-gray-800">Nu. {Number(cost.totalAmount).toLocaleString()}</td>
                                          <td className="px-4 py-2 text-sm text-gray-500">{cost.remarks || "—"}</td>
                                          <td className="px-4 py-2 text-sm">
                                            <button onClick={() => handleDeleteCost(cost._id)} className="text-red-500 hover:text-red-700">
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* MINI FORM TO ADD COST */}
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Cost</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cost Type *</label>
                                    <select
                                      value={costFormData.programCostType}
                                      onChange={(e) => setCostFormData({ ...costFormData, programCostType: e.target.value })}
                                      className="w-full border rounded px-2 py-1.5 text-sm"
                                    >
                                      <option value="">Select Cost Type</option>
                                      {masterCostTypes.map((c) => (
                                        <option key={c._id} value={c.programCostType}>{c.programCostType}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Amount (Nu.) *</label>
                                    <input
                                      type="number"
                                      value={costFormData.totalAmount}
                                      onChange={(e) => setCostFormData({ ...costFormData, totalAmount: e.target.value })}
                                      placeholder="e.g., 15000"
                                      className="w-full border rounded px-2 py-1.5 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Remarks</label>
                                    <input
                                      type="text"
                                      value={costFormData.remarks}
                                      onChange={(e) => setCostFormData({ ...costFormData, remarks: e.target.value })}
                                      placeholder="Optional"
                                      className="w-full border rounded px-2 py-1.5 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <button
                                      onClick={handleAddCost}
                                      disabled={isAddingCost}
                                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                                    >
                                      {isAddingCost ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                      Add Cost
                                    </button>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="font-semibold text-lg disabled:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  &lt;
                </button>
                <span>Page {currentPage} of {totalPages}</span>
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