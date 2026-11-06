"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Trash2, Eye, EyeOff, Search, Loader2, RefreshCw, Database,
  Pencil, Save, X, Upload, User, Mail, Phone, Calendar,
  Building, MapPin, Briefcase, GraduationCap, Users, FileText,
  Award, Hash, Crop as CropIcon, ZoomIn, ZoomOut, Edit, Layout,
  UserMinus, UserPlus, ArrowRightLeft, Armchair, TrendingUp,
  Download, Target, Printer, UserCheck, Clock
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, PieChart, Pie, Cell, ComposedChart
} from "recharts";

// ============================================
// DROPDOWN OPTIONS
// ============================================
const GENDER_OPTIONS = ["Male", "Female"];
const POSITION_TYPE_OPTIONS = ["Managerial", "Specialist"];
const DEGREE_OPTIONS = ["PHD Degree", "Master Degree", "Bachelor Degree", "PG Diploma", "High School", "Non Formal Education", "Certificate", "Diploma"];
const MOG_OPTIONS = ["Executive and Specialist Services Group", "Planning and Research Services Group", "Administration and Support Services Group", "Human Resource Services Group", "Legal and Legislative Services Group", "Finance and Audit Services Group", "Information Communication and Technology Services Group"];
const SUB_GROUP_OPTIONS = ["Executive Services", "Research Services", "Secretarial Services", "HR Management & Development Services", "Integrity & Promotion Services", "Administration Services", "Legal Services", "Specialist Services", "Planning Services", "Finance, Accounting & Budgets Services", "Property and Management Services", "ICT Services", "Media Services", "Statistical Services"];
const SUPER_STRUCTURE_OPTIONS = ["EX & ES Service", "Administration Service", "Technical Service", "Education Service", "Finance Service"];
const CURRENT_STATUS_OPTIONS = ["Active", "Study Leave", "Maternity Leave", "EOL", "Deputation", "Secondment", "Separated"];
const INTACT_TYPE_OPTIONS = ["Intact type", "Lateral Transfer", "Handpick", "Single Window Recruitment", "Regular Transfer"];

// Static Target (Not in DB)
const APPROVED_STRENGTH = 165; 

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function HREmployeePage() {
  const [activePage, setActivePage] = useState("dashboard"); // "dashboard" or "management"

  // ---------- Management State ----------
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [cidInput, setCidInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedCid, setExpandedCid] = useState(null);
  const [editingCid, setEditingCid] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const printRef = useRef(null);

  const [photoMap, setPhotoMap] = useState({});
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [currentCidForUpload, setCurrentCidForUpload] = useState(null);
  const [isEditingExistingPhoto, setIsEditingExistingPhoto] = useState(false);
  const [photoNotification, setPhotoNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [isPrinting, setIsPrinting] = useState(false);

  const showPhotoNotification = (message, type = "success") => {
    setPhotoNotification({ message, type });
    setTimeout(() => setPhotoNotification(null), 4000);
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ================== LOAD, SYNC, FETCH ==================
  const loadFromDatabase = async () => {
    setLoadingAll(true);
    try {
      const res = await fetch("/api/hr/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        showNotification(`Loaded ${data.length} employees from database`, "success");
      } else {
        showNotification("Failed to load employees", "error");
      }
    } catch (err) {
      showNotification("Error loading employees", "error");
    } finally {
      setLoadingAll(false);
    }
  };

  const syncEmployees = async () => {
    setSyncing(true);
    try {
      const cidRes = await fetch("/employee-cids.json");
      const { cids } = await cidRes.json();
      const res = await fetch("/api/hr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cids }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, "success");
        loadFromDatabase();
      } else {
        showNotification(data.error || "Sync failed", "error");
      }
    } catch (err) {
      showNotification("Error syncing employees", "error");
    } finally {
      setSyncing(false);
    }
  };

  const fetchEmployeeByCID = async (cid) => {
    if (!cid || cid.trim().length === 0) {
      showNotification("Please enter a valid CID Number", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/employee/${cid.trim()}`);
      if (res.ok) {
        const data = await res.json();
        const exists = employees.some((emp) => emp.cidNumber === data.cidNumber);
        if (!exists) {
          setEmployees((prev) => [data, ...prev]);
          showNotification(`Employee "${data.fullName}" added successfully`, "success");
        } else {
          showNotification(`Employee "${data.fullName}" already exists`, "error");
        }
        setCidInput("");
      } else if (res.status === 404) {
        showNotification("Employee not found with this CID", "error");
      } else {
        const errorData = await res.json();
        showNotification(errorData.error || "Failed to fetch employee data", "error");
      }
    } catch (err) {
      showNotification("Network error – failed to connect to the server", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================== HANDLERS ==================
  const handleSearchChange = (e) => { setSearch(e.target.value); setCurrentPage(1); };
  const handleCidInputChange = (e) => setCidInput(e.target.value);
  const handleCidKeyDown = (e) => { if (e.key === "Enter") fetchEmployeeByCID(cidInput); };
  const handleRowsChange = (e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); };
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const toggleView = (cid) => {
    if (expandedCid === cid) {
      setExpandedCid(null);
      setEditingCid(null);
    } else {
      setExpandedCid(cid);
      setEditingCid(null);
      setActiveTab("personal");
    }
  };

  // ================== PRINT ==================
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 200);
    }, 150);
  };

  // ================== EDIT ==================
  const startEdit = (employee) => {
    setEditingCid(employee.cidNumber);
    setEditData({
      gender: employee.gender || "",
      parentAgency: employee.parentAgency || "Anti-Corruption Commission",
      mog: employee.mog || "",
      subGroup: employee.subGroup || "",
      superStructure: employee.superStructure || "",
      positionType: employee.positionType || "",
      degree: employee.degree || "",
      qualification: employee.qualification || "",
      remarks: employee.remarks || "",
      currentStatus: employee.currentStatus || "Active",
      dateOfJoining: employee.dateOfJoining || "",
      intactType: employee.intactType || "",
    });
  };

  const cancelEdit = () => { setEditingCid(null); setEditData({}); };

  const saveEdit = async (cid) => {
    try {
      const res = await fetch(`/api/hr/employee/${cid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setEmployees((prev) => prev.map((emp) => (emp.cidNumber === cid ? updated : emp)));
        showNotification("Employee updated successfully", "success");
        setEditingCid(null);
        setEditData({});
      } else {
        const errorData = await res.json();
        showNotification(errorData.error || "Update failed", "error");
      }
    } catch (err) {
      showNotification("Error updating employee", "error");
    }
  };

  // ---------- Photo Logic ----------
  const deletePhoto = async (cid) => {
    if (!confirm("Are you sure you want to delete this employee's photo?")) return;
    try {
      const res = await fetch(`/api/hr/employee/${cid}/photo`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setEmployees((prev) => prev.map((emp) => (emp.cidNumber === cid ? data.employee : emp)));
        setPhotoMap((prev) => { const next = { ...prev }; delete next[cid]; return next; });
        showPhotoNotification("Photo deleted successfully", "success");
      } else {
        const errorData = await res.json();
        showPhotoNotification(errorData.error || "Delete failed", "error");
      }
    } catch (err) {
      showPhotoNotification("Error deleting photo", "error");
    }
  };

  const triggerFilePicker = (cid) => {
    setCurrentCidForUpload(cid);
    setIsEditingExistingPhoto(false);
    fileInputRef.current?.click();
  };

  const editExistingPhoto = (cid, existingPhotoBase64) => {
    if (!existingPhotoBase64) {
      showPhotoNotification("No photo to edit. Please upload one first.", "error");
      return;
    }
    setCurrentCidForUpload(cid);
    setIsEditingExistingPhoto(true);
    setImageSrc(existingPhotoBase64);
    setCropModalOpen(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) { showPhotoNotification("Please select a photo", "error"); return; }
    if (file.size > 20 * 1024 * 1024) { showPhotoNotification("Photo must be less than 20MB", "error"); return; }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setCropModalOpen(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setIsEditingExistingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels);

  const handleSavePositionedPhoto = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      showPhotoNotification("Please position the photo first", "error");
      return;
    }
    setUploadingPhoto(true);
    try {
      const outputSize = 300;
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve) => { image.onload = resolve; });
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, outputSize, outputSize);
      const { x, y, width, height } = croppedAreaPixels;
      ctx.drawImage(image, x, y, width, height, 0, 0, outputSize, outputSize);
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);

      const formData = new FormData();
      const blob = await fetch(croppedBase64).then((res) => res.blob());
      formData.append("photo", blob, "avatar.jpg");

      const res = await fetch(`/api/hr/employee/${currentCidForUpload}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees((prev) => prev.map((emp) => (emp.cidNumber === currentCidForUpload ? data.employee : emp)));
        setPhotoMap((prev) => { const next = { ...prev }; delete next[currentCidForUpload]; return next; });
        showPhotoNotification(isEditingExistingPhoto ? "Photo repositioned successfully" : "Photo uploaded successfully", "success");
        setCropModalOpen(false);
        setImageSrc(null);
        setCroppedAreaPixels(null);
      } else {
        const errorData = await res.json();
        showPhotoNotification(errorData.error || "Upload failed", "error");
      }
    } catch (err) {
      showPhotoNotification("Error uploading photo", "error");
    } finally {
      setUploadingPhoto(false);
      setCurrentCidForUpload(null);
      setIsEditingExistingPhoto(false);
    }
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsEditingExistingPhoto(false);
  };

  const removeEmployee = (cid) => {
    if (!confirm(`Are you sure you want to remove this employee?`)) return;
    setEmployees((prev) => prev.filter((emp) => emp.cidNumber !== cid));
    if (expandedCid === cid) setExpandedCid(null);
    if (editingCid === cid) setEditingCid(null);
    showNotification("Employee removed from list", "success");
  };

  const clearAll = () => {
    if (!confirm(`Are you sure you want to clear all employees?`)) return;
    setEmployees([]);
    setExpandedCid(null);
    setEditingCid(null);
    showNotification("All employees cleared", "success");
  };

  useEffect(() => { loadFromDatabase(); }, []);

  // ================== FILTER & SORT ==================
  const filtered = employees.filter((item) =>
    (item.fullName?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (item.cidNumber?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (item.positionTitle?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (item.department?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (item.division?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  const loadPhotosForEmployees = async (employeeList) => {
    const missing = employeeList.filter((emp) => !photoMap[emp.cidNumber]);
    if (missing.length === 0) return;
    const BATCH_SIZE = 5;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (emp) => {
          try {
            const res = await fetch(`/api/hr/employee/${emp.cidNumber}/photo`);
            if (!res.ok) return null;
            const data = await res.json();
            return { cid: emp.cidNumber, photo: data.passportPhoto };
          } catch { return null; }
        })
      );
      setPhotoMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => { if (r && r.photo) next[r.cid] = r.photo; });
        return next;
      });
    }
  };

  useEffect(() => {
    if (paginated.length > 0 && !loadingAll) loadPhotosForEmployees(paginated);
  }, [currentPage, rowsPerPage, search, employees.length, loadingAll]);

  // ============================================
  // DASHBOARD DATA CALCULATION (PULLED FROM DB)
  // ============================================
  // 1. Calculate Stats directly from the employees array
  const currentStaffCount = employees.filter(e => e.currentStatus !== "Separated").length;
  const separatedCount = employees.filter(e => e.currentStatus === "Separated").length;
  const recruitedCount = employees.filter(e => e.intactType === "Single Window Recruitment").length;
  const transferredCount = employees.filter(e => e.intactType === "Lateral Transfer" || e.intactType === "Regular Transfer").length;
  const vacancyCount = APPROVED_STRENGTH - currentStaffCount;

  // 2. Aggregate Department Data
  const deptMap = {};
  employees.forEach(emp => {
    const dept = emp.department || "Unassigned";
    if (!deptMap[dept]) {
      deptMap[dept] = { dept, approved: 0, staff25: 0, separated: 0, recruited: 0, transferred: 0, staff26: 0 };
    }
    
    // Increment based on actual data
    deptMap[dept].staff26 += 1;
    deptMap[dept].staff25 += 1; 
    deptMap[dept].approved += 1; 
    
    if (emp.currentStatus === "Separated") deptMap[dept].separated += 1;
    if (emp.intactType === "Single Window Recruitment") deptMap[dept].recruited += 1;
    if (emp.intactType === "Lateral Transfer" || emp.intactType === "Regular Transfer") deptMap[dept].transferred += 1;
  });
  
  const departmentData = Object.values(deptMap).sort((a, b) => b.staff26 - a.staff26);

  // 3. Prepare Chart Data
  const TREND_DATA = [
    { name: "Staff (30 Jun 2025)", value: currentStaffCount - recruitedCount + separatedCount, fill: "#2563eb" },
    { name: "Recruited", value: recruitedCount, fill: "#22c55e" },
    { name: "Separated", value: -separatedCount, fill: "#ef4444" },
    { name: "Internal Transfer (net)", value: transferredCount, fill: "#8b5cf6" },
    { name: "Staff (30 Jun 2026)", value: currentStaffCount, fill: "#2563eb" },
  ];

  const COMPOSITION_DATA = [
    { name: "Approved Strength", value: APPROVED_STRENGTH, fill: "#3b82f6" },
    { name: "Current Staff (Jun 2026)", value: currentStaffCount, fill: "#22c55e" },
    { name: "Vacancies", value: vacancyCount, fill: "#f97316" },
  ];

  const MOVEMENT_DATA = [
    { name: "Recruited", value: recruitedCount, fill: "#22c55e" },
    { name: "Separated", value: separatedCount, fill: "#ef4444" },
    { name: "Internally Transferred (net)", value: transferredCount, fill: "#8b5cf6" },
  ].filter(d => d.value > 0); // Hide zero values from pie chart for better aesthetics

  const totalMovements = recruitedCount + separatedCount + transferredCount;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
        
        {/* Top Navigation Toggle */}
        <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm no-print">
          <div className="flex gap-2">
            <button
              onClick={() => setActivePage("dashboard")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activePage === "dashboard" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Staffing Dashboard
            </button>
            <button
              onClick={() => setActivePage("management")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activePage === "management" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Employee Management
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* DASHBOARD VIEW (Visually Cloned) */}
        {/* ============================================ */}
        {activePage === "dashboard" && (
          <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">ACC STAFFING DASHBOARD</h1>
                <p className="text-sm text-gray-600 font-medium mt-1">Recruitment, Separation and Staffing Strength (FY 2025–2026)</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-md shadow-sm border border-gray-200">
                  As of June 2026
                </span>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
              <StatCard icon={Users} label="Approved Staff Strength" value={APPROVED_STRENGTH} color="text-blue-800" bg="bg-blue-100" border="border-blue-200" />
              <StatCard icon={Users} label="Staff Strength (as of 30 Jun 2025)" value={currentStaffCount - recruitedCount + separatedCount} sub="Calculated from DB" color="text-green-800" bg="bg-green-100" border="border-green-200" />
              <StatCard icon={UserMinus} label="Separated (Jul 2025 - Jun 2026)" value={separatedCount} sub="From DB Status" color="text-red-800" bg="bg-red-100" border="border-red-200" />
              <StatCard icon={UserPlus} label="Recruited (Jul 2025 - Jun 2026)" value={recruitedCount} sub="From DB Intact Type" color="text-green-800" bg="bg-green-100" border="border-green-200" />
              <StatCard icon={ArrowRightLeft} label="Internally Transferred (Jul 2025 - Jun 2026)" value={transferredCount} sub="From DB Intact Type" color="text-purple-800" bg="bg-purple-100" border="border-purple-200" />
              <StatCard icon={Users} label="Staff Strength (as of Jun 2026)" value={currentStaffCount} sub="Active Employees" color="text-orange-800" bg="bg-orange-100" border="border-orange-200" />
              <StatCard icon={Armchair} label="Vacancies (as of Jun 2026)" value={vacancyCount} sub={`${((vacancyCount/APPROVED_STRENGTH)*100).toFixed(1)}% vacancy rate`} color="text-blue-800" bg="bg-blue-100" border="border-blue-200" />
            </div>

            {/* Middle Section - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* 1. Staffing Trend */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Trend (Total)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Change in staff strength over the period</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} interval={0} angle={-15} textAnchor="end" height={40} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={30}>
                        {TREND_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Staffing Composition */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Composition (as of June 2026)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Approved vs. Current staff and vacancies</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={COMPOSITION_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={40}>
                        {COMPOSITION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Staffing Movement */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Movement (Total)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Recruitment, separation and internal transfers</p>
                <div className="h-56 flex justify-center items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={MOVEMENT_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                        {MOVEMENT_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">{totalMovements}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Movements</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                  {MOVEMENT_DATA.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                      <span className="text-gray-600 font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section - Department & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* 4. Department-wise Staffing */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
                  <h3 className="font-bold text-gray-800 text-sm">Department/Division-wise Staffing</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Approved strength, staff strength (2025 and 2026) and net change</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={departmentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dept" tick={{ fontSize: 8, fill: '#6b7280' }} interval={0} angle={-35} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" iconSize={6} />
                      <Bar dataKey="approved" name="Approved Strength" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                      <Bar dataKey="staff25" name="Staff (Jun 2025)" fill="#22c55e" radius={[2, 2, 0, 0]} barSize={12} />
                      <Bar dataKey="staff26" name="Staff (Jun 2026)" fill="#f97316" radius={[2, 2, 0, 0]} barSize={12} />
                      <Line type="monotone" dataKey="transferred" name="Net Change" stroke="#1e293b" strokeWidth={2} dot={{ r: 3, fill: '#1e293b' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5. Detailed Staffing Data */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">5</span>
                  <h3 className="font-bold text-gray-800 text-sm">Detailed Staffing Data</h3>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[280px]">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="text-[9px] uppercase bg-blue-100 text-blue-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 font-bold border-b border-blue-200">Departments / Divisions / ROs</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Approved</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Jun 2025</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Sep</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Rec</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Trans</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Jun 2026</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {departmentData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition-colors">
                          <td className="px-2 py-1.5 font-medium text-gray-700 truncate max-w-[150px]" title={row.dept}>{row.dept}</td>
                          <td className="px-2 py-1.5 text-center text-blue-600 font-bold bg-blue-50/50">{row.approved}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{row.staff25}</td>
                          <td className="px-2 py-1.5 text-center text-red-500 font-medium">{row.separated}</td>
                          <td className="px-2 py-1.5 text-center text-green-500 font-medium">{row.recruited}</td>
                          <td className={`px-2 py-1.5 text-center font-medium ${row.transferred > 0 ? 'text-green-600' : row.transferred < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {row.transferred > 0 ? `+${row.transferred}` : row.transferred}
                          </td>
                          <td className="px-2 py-1.5 text-center text-orange-600 font-bold bg-orange-50/50">{row.staff26}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Key Takeaways (Dynamic) */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                    <Target size={20} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">Key Takeaways</h3>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-600" />
                    <span>Staff strength increased by <strong>{recruitedCount - separatedCount}</strong> this period.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={14} className="text-green-600" />
                    <span><strong>{recruitedCount} employees</strong> were recruited during the period.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserMinus size={14} className="text-red-600" />
                    <span><strong>{separatedCount} employees</strong> separated during the period.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft size={14} className="text-purple-600" />
                    <span>Net internal transfer increased by <strong>{transferredCount}</strong>.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Armchair size={14} className="text-orange-600" />
                    <span><strong>{vacancyCount} positions</strong> remain vacant.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MANAGEMENT VIEW (Original Code) */}
        {/* ============================================ */}
        {activePage === "management" && (
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">HR Employee Management</h1>
              <div className="flex gap-2">
                <button onClick={syncEmployees} disabled={syncing} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 shadow-sm">
                  {syncing ? <><Loader2 size={14} className="animate-spin" /> Syncing...</> : <><RefreshCw size={14} /> Sync from HR</>}
                </button>
                <button onClick={loadFromDatabase} disabled={loadingAll} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
                  {loadingAll ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Load from DB
                </button>
                {employees.length > 0 && (
                  <button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition shadow-sm">
                    <Trash2 size={14} /> Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Notifications */}
            {notification && (
              <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
                {notification.message}
              </div>
            )}

            {/* Search by CID */}
            <div className="bg-white shadow rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium block mb-1">Search Employee by CID</label>
                  <div className="flex gap-2">
                    <input type="text" value={cidInput} onChange={handleCidInputChange} onKeyDown={handleCidKeyDown} placeholder="e.g. 12008001606" className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none" disabled={loading} />
                    <button onClick={() => fetchEmployeeByCID(cidInput)} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
                      {loading ? "Searching..." : <><Search size={16} /> Fetch Employee</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
              <input type="text" value={search} onChange={handleSearchChange} placeholder="Search employees..." className="w-64 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none" />
              <div className="flex items-center gap-2 text-sm">
                <span>Show</span>
                <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
                <span>entries</span>
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">
                  <Users size={14} className="mr-1" /> Total: {employees.length} employees
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium uppercase w-12">Photo</th>
                    <th onClick={() => handleSort("fullName")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition">Full Name</th>
                    <th onClick={() => handleSort("cidNumber")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition">CID Number</th>
                    <th onClick={() => handleSort("positionTitle")} className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition">Position</th>
                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Department & Division</th>
                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginated.length > 0 ? (
                    paginated.map((item) => {
                      const isExpanded = expandedCid === item.cidNumber;
                      const isEditing = editingCid === item.cidNumber;
                      return (
                        <React.Fragment key={item.cidNumber}>
                          <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-4 py-3 text-sm">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-gray-200">
                                {photoMap[item.cidNumber] ? (
                                  <img src={photoMap[item.cidNumber]} alt={item.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm font-medium">{item.fullName}</td>
                            <td className="px-6 py-3 text-sm font-mono">{item.cidNumber}</td>
                            <td className="px-6 py-3 text-sm">
                              {item.positionTitle}
                              {item.positionLevel && (
                                <span className="ml-1 text-xs text-gray-500">({item.positionLevel}{item.subLevel ? `-${item.subLevel}` : ""})</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {item.department && <span className="block text-gray-800">{item.department}</span>}
                              {item.division && <span className="block text-xs text-gray-500">{item.division}</span>}
                              {!item.department && !item.division && <span className="text-gray-400 text-sm">—</span>}
                            </td>
                            <td className="px-6 py-3 text-sm">
                              <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">{item.email}</a>
                            </td>
                            <td className="px-6 py-3 text-sm flex gap-2">
                              <button onClick={() => toggleView(item.cidNumber)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-blue-500 hover:text-blue-500 transition">
                                {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />} {isExpanded ? "Close" : "View"}
                              </button>
                              <button onClick={() => removeEmployee(item.cidNumber)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition">
                                <Trash2 size={14} /> Remove
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan="7" className="px-6 py-6 bg-blue-50/50">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                  <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                                    <div className="flex-shrink-0 relative">
                                      {photoMap[item.cidNumber] ? (
                                        <img src={photoMap[item.cidNumber]} alt="Passport" className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md" />
                                      ) : (
                                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-md">
                                          <User className="w-10 h-10 text-blue-600" />
                                        </div>
                                      )}
                                      <div className="absolute -bottom-2 -right-2 flex gap-1 bg-white rounded-full shadow-md p-1 border border-gray-200 no-print">
                                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" disabled={uploadingPhoto} onChange={handleFileSelect} />
                                        {photoMap[item.cidNumber] ? (
                                          <>
                                            <button onClick={() => editExistingPhoto(item.cidNumber, photoMap[item.cidNumber])} disabled={uploadingPhoto} className="p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-50" title="Edit Photo"><Edit size={14} className="text-blue-600" /></button>
                                            <button onClick={() => deletePhoto(item.cidNumber)} disabled={uploadingPhoto} className="p-1.5 rounded-full hover:bg-red-50 transition disabled:opacity-50" title="Delete Photo"><Trash2 size={14} className="text-red-600" /></button>
                                          </>
                                        ) : (
                                          <button onClick={() => triggerFilePicker(item.cidNumber)} disabled={uploadingPhoto} className="p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-50" title="Upload Photo"><Upload size={14} className="text-blue-600" /></button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-xl font-bold text-gray-900">{item.fullName}</h3>
                                      <p className="text-sm text-gray-600">CID: <span className="font-mono">{item.cidNumber}</span></p>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.positionTitle || "N/A"}</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{item.agency || "N/A"}</span>
                                      </div>
                                    </div>
                                    <div className="no-print">
                                      <button onClick={() => startEdit(item)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">
                                        <Pencil size={16} /> Edit HR Data
                                      </button>
                                    </div>
                                  </div>

                                  {photoNotification && (
                                    <div className={`px-4 py-2 text-sm no-print ${photoNotification.type === "success" ? "bg-green-50 text-green-700 border-b border-green-200" : "bg-red-50 text-red-700 border-b border-red-200"}`}>
                                      {photoNotification.message}
                                    </div>
                                  )}

                                  {isEditing ? (
                                    <div className="p-6 no-print">
                                      <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-lg">Edit HR Fields</h4>
                                        <button onClick={cancelEdit} className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-100"><X size={14} /> Cancel</button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField label="Gender" value={editData.gender || ""} options={GENDER_OPTIONS} onChange={(val) => setEditData({ ...editData, gender: val })} />
                                        <InputField label="Parent Agency" value={editData.parentAgency || "Anti-Corruption Commission"} onChange={(val) => setEditData({ ...editData, parentAgency: val })} />
                                        <SelectField label="MoG" value={editData.mog || ""} options={MOG_OPTIONS} onChange={(val) => setEditData({ ...editData, mog: val })} />
                                        <SelectField label="Sub Group" value={editData.subGroup || ""} options={SUB_GROUP_OPTIONS} onChange={(val) => setEditData({ ...editData, subGroup: val })} />
                                        <SelectField label="Super Structure" value={editData.superStructure || ""} options={SUPER_STRUCTURE_OPTIONS} onChange={(val) => setEditData({ ...editData, superStructure: val })} />
                                        <SelectField label="Position Type" value={editData.positionType || ""} options={POSITION_TYPE_OPTIONS} onChange={(val) => setEditData({ ...editData, positionType: val })} />
                                        <SelectField label="Degree" value={editData.degree || ""} options={DEGREE_OPTIONS} onChange={(val) => setEditData({ ...editData, degree: val })} />
                                        <InputField label="Area of Study" value={editData.qualification || ""} onChange={(val) => setEditData({ ...editData, qualification: val })} />
                                        <SelectField label="Current Status" value={editData.currentStatus || "Active"} options={CURRENT_STATUS_OPTIONS} onChange={(val) => setEditData({ ...editData, currentStatus: val })} />
                                        <div>
                                          <label className="text-xs font-medium text-gray-500 block">Date of Joining ACC</label>
                                          <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={editData.dateOfJoining || ""} onChange={(e) => setEditData({ ...editData, dateOfJoining: e.target.value })} />
                                        </div>
                                        <SelectField label="Intact Type" value={editData.intactType || ""} options={INTACT_TYPE_OPTIONS} onChange={(val) => setEditData({ ...editData, intactType: val })} />
                                        <div>
                                          <label className="text-xs font-medium text-gray-500 block">Remarks</label>
                                          <textarea className="w-full border rounded px-2 py-1 text-sm" rows="2" value={editData.remarks || ""} onChange={(e) => setEditData({ ...editData, remarks: e.target.value })} />
                                        </div>
                                      </div>
                                      <div className="mt-4 flex justify-end">
                                        <button onClick={() => saveEdit(item.cidNumber)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"><Save size={16} /> Save Changes</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-6">
                                      <div className="flex gap-1 mb-6 flex-wrap">
                                        <TabButton active={activeTab === "personal"} onClick={() => setActiveTab("personal")} icon={User} label="Personal" />
                                        <TabButton active={activeTab === "employment"} onClick={() => setActiveTab("employment")} icon={Briefcase} label="Employment" />
                                        <TabButton active={activeTab === "hr"} onClick={() => setActiveTab("hr")} icon={FileText} label="HR Fields" />
                                        <TabButton active={activeTab === "agency"} onClick={() => setActiveTab("agency")} icon={MapPin} label="Agency Path" />
                                        <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={Layout} label="All" />
                                        {activeTab === "all" && (
                                          <button onClick={handlePrint} className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md px-4 py-2 hover:bg-blue-50 transition no-print">Print</button>
                                        )}
                                      </div>

                                      <div className="mt-2">
                                        {activeTab === "personal" && (
                                          <TabPanel>
                                            <Section title="Personal Information" icon={User}>
                                              <DetailItem icon={User} label="Gender" value={item.gender} />
                                              <DetailItem icon={Calendar} label="Date of Birth" value={item.dateOfBirth} />
                                              <DetailItem icon={Phone} label="Mobile" value={item.mobile} />
                                              <DetailItem icon={Mail} label="Email" value={item.email} isLink={`mailto:${item.email}`} />
                                            </Section>
                                          </TabPanel>
                                        )}
                                        {activeTab === "employment" && (
                                          <TabPanel>
                                            <Section title="Employment Details" icon={Briefcase}>
                                              <DetailItem icon={Briefcase} label="Employee Number" value={item.employeeNumber} />
                                              <DetailItem icon={Award} label="Position Level" value={`${item.positionLevel || ""}${item.subLevel ? `-${item.subLevel}` : ""}`} />
                                              <DetailItem icon={Calendar} label="Appointment Date" value={item.dateOfAppointment} />
                                              <DetailItem icon={Calendar} label="Last Promotion" value={item.lastDateOfPromotion} />
                                              <DetailItem icon={Users} label="Employee Type" value={item.empType} />
                                            </Section>
                                          </TabPanel>
                                        )}
                                        {activeTab === "hr" && (
                                          <TabPanel>
                                            <Section title="HR Custom Fields" icon={FileText}>
                                              <DetailItem icon={Building} label="Parent Agency" value={item.parentAgency || "Anti-Corruption Commission"} />
                                              <DetailItem icon={MapPin} label="MoG" value={item.mog} />
                                              <DetailItem icon={FileText} label="Sub Group" value={item.subGroup} />
                                              <DetailItem icon={FileText} label="Super Structure" value={item.superStructure} />
                                              <DetailItem icon={Briefcase} label="Position Type" value={item.positionType} />
                                              <DetailItem icon={GraduationCap} label="Degree" value={item.degree} />
                                              <DetailItem icon={GraduationCap} label="Area of Study" value={item.qualification} />
                                              <DetailItem icon={UserCheck} label="Current Status" value={item.currentStatus} />
                                              <DetailItem icon={Calendar} label="Date of Joining ACC" value={item.dateOfJoining} />
                                              <DetailItem icon={Hash} label="Intact Type" value={item.intactType} />
                                              <DetailItem icon={FileText} label="Remarks" value={item.remarks} />
                                            </Section>
                                          </TabPanel>
                                        )}
                                        {activeTab === "agency" && (
                                          <TabPanel>
                                            <Section title="Agency Path" icon={MapPin}>
                                              <DetailItem icon={MapPin} label="Full Agency Path" value={item.fullAgencyPath} />
                                              <DetailItem icon={Building} label="Department" value={item.department} />
                                              <DetailItem icon={Building} label="Division" value={item.division} />
                                            </Section>
                                          </TabPanel>
                                        )}
                                        {activeTab === "all" && (
                                          <TabPanel>
                                            <div ref={printRef} className="print-content space-y-8">
                                              <Section title="Personal Information" icon={User}>
                                                <DetailItem icon={User} label="Gender" value={item.gender} />
                                                <DetailItem icon={Calendar} label="Date of Birth" value={item.dateOfBirth} />
                                                <DetailItem icon={Phone} label="Mobile" value={item.mobile} />
                                                <DetailItem icon={Mail} label="Email" value={item.email} isLink={`mailto:${item.email}`} />
                                              </Section>
                                              <Section title="Employment Details" icon={Briefcase}>
                                                <DetailItem icon={Briefcase} label="Employee Number" value={item.employeeNumber} />
                                                <DetailItem icon={Award} label="Position Level" value={`${item.positionLevel || ""}${item.subLevel ? `-${item.subLevel}` : ""}`} />
                                                <DetailItem icon={Calendar} label="Appointment Date" value={item.dateOfAppointment} />
                                                <DetailItem icon={Calendar} label="Last Promotion" value={item.lastDateOfPromotion} />
                                                <DetailItem icon={Users} label="Employee Type" value={item.empType} />
                                              </Section>
                                              <Section title="HR Custom Fields" icon={FileText}>
                                                <DetailItem icon={Building} label="Parent Agency" value={item.parentAgency || "Anti-Corruption Commission"} />
                                                <DetailItem icon={MapPin} label="MoG" value={item.mog} />
                                                <DetailItem icon={FileText} label="Sub Group" value={item.subGroup} />
                                                <DetailItem icon={FileText} label="Super Structure" value={item.superStructure} />
                                                <DetailItem icon={Briefcase} label="Position Type" value={item.positionType} />
                                                <DetailItem icon={GraduationCap} label="Degree" value={item.degree} />
                                                <DetailItem icon={GraduationCap} label="Area of Study" value={item.qualification} />
                                                <DetailItem icon={UserCheck} label="Current Status" value={item.currentStatus} />
                                                <DetailItem icon={Calendar} label="Date of Joining ACC" value={item.dateOfJoining} />
                                                <DetailItem icon={Hash} label="Intact Type" value={item.intactType} />
                                                <DetailItem icon={FileText} label="Remarks" value={item.remarks} />
                                              </Section>
                                              <Section title="Agency Path" icon={MapPin}>
                                                <DetailItem icon={MapPin} label="Full Agency Path" value={item.fullAgencyPath} />
                                                <DetailItem icon={Building} label="Department" value={item.department} />
                                                <DetailItem icon={Building} label="Division" value={item.division} />
                                              </Section>
                                            </div>
                                          </TabPanel>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-500">
                        {loadingAll ? "Loading..." : "No employees found. Use 'Sync from HR' or search by CID."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-4 mt-5 text-sm">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&lt;</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&gt;</button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ============================================ */}
      {/* PRINT VIEW (Only renders when printing) */}
      {/* ============================================ */}
      {isPrinting && expandedCid && (
        <div className="print-view">
          {employees.filter((emp) => emp.cidNumber === expandedCid).map((item) => (
            <div key={item.cidNumber} className="print-container">
              <div className="print-header">
                <div className="print-avatar">
                  {photoMap[item.cidNumber] ? (
                    <img src={photoMap[item.cidNumber]} alt={item.fullName} className="w-32 h-32 rounded-full object-cover border-4 border-gray-300" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="print-name">
                  <h1>{item.fullName}</h1>
                  <p>CID: {item.cidNumber}</p>
                  <p>{item.positionTitle || "N/A"}</p>
                </div>
              </div>
              <div className="print-body">
                <div className="print-section">
                  <h3>Personal Information</h3>
                  <div className="print-grid">
                    <div><span>Gender</span>{item.gender || "N/A"}</div>
                    <div><span>Date of Birth</span>{item.dateOfBirth || "N/A"}</div>
                    <div><span>Mobile</span>{item.mobile || "N/A"}</div>
                    <div><span>Email</span>{item.email || "N/A"}</div>
                  </div>
                </div>
                <div className="print-section">
                  <h3>Employment Details</h3>
                  <div className="print-grid">
                    <div><span>Employee Number</span>{item.employeeNumber || "N/A"}</div>
                    <div><span>Position Level</span>{item.positionLevel || "N/A"}{item.subLevel ? `-${item.subLevel}` : ""}</div>
                    <div><span>Appointment Date</span>{item.dateOfAppointment || "N/A"}</div>
                    <div><span>Last Promotion</span>{item.lastDateOfPromotion || "N/A"}</div>
                    <div><span>Employee Type</span>{item.empType || "N/A"}</div>
                  </div>
                </div>
                <div className="print-section">
                  <h3>HR Custom Fields</h3>
                  <div className="print-grid">
                    <div><span>Parent Agency</span>{item.parentAgency || "Anti-Corruption Commission"}</div>
                    <div><span>MoG</span>{item.mog || "N/A"}</div>
                    <div><span>Sub Group</span>{item.subGroup || "N/A"}</div>
                    <div><span>Super Structure</span>{item.superStructure || "N/A"}</div>
                    <div><span>Position Type</span>{item.positionType || "N/A"}</div>
                    <div><span>Degree</span>{item.degree || "N/A"}</div>
                    <div><span>Area of Study</span>{item.qualification || "N/A"}</div>
                    <div><span>Current Status</span>{item.currentStatus || "N/A"}</div>
                    <div><span>Date of Joining ACC</span>{item.dateOfJoining || "N/A"}</div>
                    <div><span>Intact Type</span>{item.intactType || "N/A"}</div>
                    <div><span>Remarks</span>{item.remarks || "N/A"}</div>
                  </div>
                </div>
                <div className="print-section">
                  <h3>Agency Path</h3>
                  <div className="print-grid">
                    <div><span>Full Agency Path</span>{item.fullAgencyPath || "N/A"}</div>
                    <div><span>Department</span>{item.department || "N/A"}</div>
                    <div><span>Division</span>{item.division || "N/A"}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CropIcon size={20} className="text-blue-600" />
                {isEditingExistingPhoto ? "Reposition Photo" : "Position Photo"}
              </h2>
              <button onClick={closeCropModal} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="p-6">
              <div className="relative bg-white rounded-lg p-4" style={{ height: 400, background: 'white' }}>
                <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} objectFit="horizontal-cover" style={{ containerStyle: { background: 'white' }, imageStyle: { background: 'white' } }} />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <ZoomOut size={18} className="text-gray-500" />
                <input type="range" min={0.5} max={5} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-600" />
                <ZoomIn size={18} className="text-gray-500" />
                <span className="text-xs text-gray-500 ml-2 w-12">{zoom.toFixed(1)}x</span>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">Drag the image to center the face within the circular frame. Use the slider to zoom in/out.</p>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button onClick={closeCropModal} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleSavePositionedPhoto} disabled={uploadingPhoto} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition">
                {uploadingPhoto ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Save size={16} />{isEditingExistingPhoto ? "Save Changes" : "Save"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        .no-print { display: block; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden; }
          .print-view, .print-view * { visibility: visible; }
          .print-view { position: absolute; left: 0; top: 0; width: 100%; padding: 15mm 12mm; background: white; box-sizing: border-box; }
          .print-container { max-width: 100%; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; }
          .print-header { display: flex; align-items: flex-start; gap: 24px; padding-bottom: 16px; border-bottom: 3px solid #2563eb; margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
          .print-avatar { flex-shrink: 0; }
          .print-avatar img, .print-avatar div { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #d1d5db; object-fit: cover; display: block; }
          .print-name { flex: 1; min-width: 0; }
          .print-name h1 { font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 6px 0; line-height: 1.2; page-break-after: avoid; break-after: avoid; }
          .print-name p { font-size: 13px; color: #4b5563; margin: 2px 0; }
          .print-body { padding: 0; }
          .print-section { margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid; }
          .print-section h3 { font-size: 14px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
          .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; }
          .print-grid > div { display: flex; flex-direction: column; padding: 2px 0; page-break-inside: avoid; break-inside: avoid; }
          .print-grid > div span { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
          .print-grid > div { font-size: 12px; color: #1f2937; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS (Dashboard & Management)
// ============================================
function StatCard({ icon: Icon, label, value, sub, color, bg, border }) {
  return (
    <div className={`bg-white p-3 rounded-lg shadow-sm border ${border} flex flex-col justify-between relative overflow-hidden`}>
      <div className="flex items-start gap-2 relative z-10">
        <div className={`p-1.5 rounded-md ${bg} ${color}`}><Icon size={16} /></div>
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight">{label}</p>
          <h3 className={`text-2xl font-black mt-0.5 ${color}`}>{value}</h3>
        </div>
      </div>
      {sub && <div className="mt-1 text-[9px] text-gray-500 font-medium relative z-10">{sub}</div>}
      <div className={`absolute bottom-0 right-0 w-16 h-16 rounded-tl-full opacity-20 ${bg}`}></div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
      <Icon size={16} />{label}
    </button>
  );
}

function TabPanel({ children }) { return <div className="py-2">{children}</div>; }

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
        {Icon && <Icon size={16} className="text-blue-500" />}{title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, isLink }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-500 block">{label}</span>
        {isLink ? <a href={isLink} className="text-blue-600 hover:underline break-words">{value}</a> : <p className="text-gray-800 break-words">{value}</p>}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block">{label}</label>
      <input type="text" className="w-full border rounded px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block">{label}</label>
      <select className="w-full border rounded px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select {label}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}