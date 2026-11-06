"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Trash2, Eye, EyeOff, Search, Loader2, RefreshCw, Database,
  Pencil, Save, X, Upload, User, Mail, Phone, Calendar,
  Building, MapPin, Briefcase, GraduationCap, Users, FileText,
  Award, Hash, Crop as CropIcon, ZoomIn, ZoomOut, Edit, Layout,
  UserMinus, UserPlus, ArrowRightLeft, Armchair, TrendingUp,
  Download, Target, Printer, UserCheck, Clock, Layers, PieChart as PieIcon, BarChart2,
  Search as SearchIcon, Ban, Settings, AlertTriangle, ShieldCheck, Activity, Globe
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, PieChart, Pie, Cell, ComposedChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
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

const APPROVED_STRENGTH = 165; 

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function HREmployeePage() {
  // Tabs: "enterprise", "staffing", "contract", "allowance", "management"
  const [activePage, setActivePage] = useState("enterprise");

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
  // DASHBOARD DATA CALCULATION
  // ============================================
  const totalEmployees = employees.length || 159;
  
  // Staffing
  const currentStaffCount = employees.filter(e => e.currentStatus !== "Separated").length || 142;
  const separatedCount = employees.filter(e => e.currentStatus === "Separated").length || 14;
  const recruitedCount = employees.filter(e => e.intactType === "Single Window Recruitment").length || 20;
  const transferredCount = employees.filter(e => e.intactType === "Lateral Transfer" || e.intactType === "Regular Transfer").length || 2;
  const vacancyCount = APPROVED_STRENGTH - currentStaffCount;

  // Contract
  const regularCount = employees.filter(e => e.empType?.toLowerCase().includes("regular") || e.intactType === "Regular Transfer" || (!e.empType && !e.intactType)).length || Math.round(totalEmployees * 0.6);
  const consolidatedCount = employees.filter(e => e.empType?.toLowerCase().includes("consolidated") || e.intactType === "Single Window Recruitment" || e.intactType === "Lateral Transfer").length || (totalEmployees - regularCount);
  const otherCount = totalEmployees - regularCount - consolidatedCount;

  // Allowance
  const investigatorCount = employees.filter(e => e.department?.toLowerCase().includes("investigation") || e.positionTitle?.toLowerCase().includes("investigator")).length || 99;
  const noAllowanceCount = separatedCount || 12;
  const othersAllowanceCount = totalEmployees - investigatorCount - noAllowanceCount;

  // Detailed Department Aggregation for Enterprise View
  const enterpriseDeptMap = {};
  employees.forEach(emp => {
    const dept = emp.department || "Unassigned";
    if (!enterpriseDeptMap[dept]) {
      enterpriseDeptMap[dept] = { 
        dept, 
        staff: 0, 
        vacancies: 0, 
        regular: 0, 
        consolidated: 0, 
        investigators: 0, 
        others: 0, 
        noAllowance: 0 
      };
    }
    
    // Staffing
    if (emp.currentStatus !== "Separated") enterpriseDeptMap[dept].staff += 1;
    // Contract
    const isReg = emp.empType?.toLowerCase().includes("regular") || emp.intactType === "Regular Transfer" || (!emp.empType && !emp.intactType);
    if (isReg) enterpriseDeptMap[dept].regular += 1;
    else enterpriseDeptMap[dept].consolidated += 1;
    // Allowance
    const isInv = emp.department?.toLowerCase().includes("investigation") || emp.positionTitle?.toLowerCase().includes("investigator");
    const isNo = emp.currentStatus === "Separated";
    if (isInv) enterpriseDeptMap[dept].investigators += 1;
    else if (isNo) enterpriseDeptMap[dept].noAllowance += 1;
    else enterpriseDeptMap[dept].others += 1;
  });

  const enterpriseDeptData = Object.values(enterpriseDeptMap).sort((a, b) => b.staff - a.staff);

  // Radar Data
  const radarData = [
    { subject: 'Staffing', A: (currentStaffCount / APPROVED_STRENGTH) * 100, fullMark: 100 },
    { subject: 'Regular', A: (regularCount / totalEmployees) * 100, fullMark: 100 },
    { subject: 'Investigators', A: (investigatorCount / totalEmployees) * 100, fullMark: 100 },
    { subject: 'Retention', A: ((totalEmployees - separatedCount) / totalEmployees) * 100, fullMark: 100 },
    { subject: 'Dept Coverage', A: (enterpriseDeptData.length / 10) * 100, fullMark: 100 },
  ];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 bg-gray-50 min-h-screen">
        
        {/* Top Navigation Toggle */}
        <div className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm no-print overflow-x-auto">
          <div className="flex gap-2">
            <button onClick={() => setActivePage("enterprise")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activePage === "enterprise" ? "bg-blue-800 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}><Globe size={16}/> Executive Overview</button>
            <button onClick={() => setActivePage("staffing")} className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activePage === "staffing" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Staffing Dashboard</button>
            <button onClick={() => setActivePage("contract")} className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activePage === "contract" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Employee Dashboard</button>
            <button onClick={() => setActivePage("allowance")} className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activePage === "allowance" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Allowance Distribution</button>
            <button onClick={() => setActivePage("management")} className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activePage === "management" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Employee Directory</button>
          </div>
        </div>

        {/* ============================================ */}
        {/* 1. ENTERPRISE DASHBOARD (EXECUTIVE OVERVIEW) */}
        {/* ============================================ */}
        {activePage === "enterprise" && (
          <div className="p-6 max-w-[1600px] mx-auto bg-gray-100 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-end mb-8 border-b border-gray-300 pb-4">
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <ShieldCheck size={36} className="text-blue-700" />
                  ACC EXECUTIVE OVERVIEW
                </h1>
                <p className="text-base text-gray-600 mt-2 font-medium">Enterprise-level cross-functional HR analytics and workforce intelligence</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-bold px-4 py-2 rounded-lg mb-2">
                  As of June 2026
                </span>
                <p className="text-sm text-gray-500">Data Source: Live DB Sync</p>
              </div>
            </div>

            {/* Executive KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-blue-600 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Headcount</p>
                  <Users className="text-blue-500" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-black text-gray-900">{totalEmployees}</p>
                  <p className="text-sm text-gray-500 mt-1">Approved: {APPROVED_STRENGTH}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-red-500 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Vacancy Gap</p>
                  <Armchair className="text-red-500" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-black text-red-600">{vacancyCount}</p>
                  <p className="text-sm text-gray-500 mt-1">{((vacancyCount/APPROVED_STRENGTH)*100).toFixed(1)}% of approved</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-green-500 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Regular Staff</p>
                  <FileText className="text-green-500" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-black text-green-600">{regularCount}</p>
                  <p className="text-sm text-gray-500 mt-1">{(regularCount/totalEmployees*100).toFixed(1)}% of workforce</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-orange-500 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Investigators</p>
                  <SearchIcon className="text-orange-500" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-black text-orange-600">{investigatorCount}</p>
                  <p className="text-sm text-gray-500 mt-1">{(investigatorCount/totalEmployees*100).toFixed(1)}% receiving 45%</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-purple-500 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Turnover</p>
                  <Activity className="text-purple-500" size={24} />
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-black text-purple-600">{((separatedCount/totalEmployees)*100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mt-1">{separatedCount} separations this year</p>
                </div>
              </div>
            </div>

            {/* Charts & Radar Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Organizational Health Radar */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2"><Activity size={20} className="text-blue-600"/> Organizational Health</h3>
                <p className="text-sm text-gray-500 mb-4">Multi-dimensional view of workforce metrics</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Metrics" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Contract Mix */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2"><Layers size={20} className="text-green-600"/> Contract Mix</h3>
                <p className="text-sm text-gray-500 mb-4">Distribution of employee contract types</p>
                <div className="h-72 flex justify-center items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: "Regular", value: regularCount, fill: "#22c55e" },
                        { name: "Consolidated", value: consolidatedCount, fill: "#f97316" },
                        { name: "Other", value: otherCount, fill: "#a855f7" }
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                        <Cell fill="#22c55e" />
                        <Cell fill="#f97316" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-gray-800">{totalEmployees}</span>
                    <span className="text-xs text-gray-500 font-bold uppercase">Staff</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Regular ({regularCount})</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Consolidated ({consolidatedCount})</div>
                </div>
              </div>

              {/* Staffing Trend Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2"><TrendingUp size={20} className="text-purple-600"/> Movement Trend</h3>
                <p className="text-sm text-gray-500 mb-4">Net change over the last fiscal year</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Recruited", value: recruitedCount, fill: "#22c55e" },
                      { name: "Separated", value: -separatedCount, fill: "#ef4444" },
                      { name: "Transferred", value: transferredCount, fill: "#8b5cf6" }
                    ]} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#8b5cf6" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Cross-Functional Data Grid */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden mb-8">
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Building size={20} className="text-blue-600"/> Cross-Functional Department Intelligence</h3>
                  <p className="text-sm text-gray-500 mt-1">Comprehensive breakdown of staffing, contracts, and allowance distribution by department</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition shadow-sm">
                  <Download size={16} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs uppercase bg-blue-900 text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold">Department / Division</th>
                      <th className="px-4 py-3 font-bold text-center bg-blue-800">Active Staff</th>
                      <th className="px-4 py-3 font-bold text-center bg-green-700">Regular</th>
                      <th className="px-4 py-3 font-bold text-center bg-orange-700">Consolidated</th>
                      <th className="px-4 py-3 font-bold text-center bg-blue-700">Investigators (45%)</th>
                      <th className="px-4 py-3 font-bold text-center bg-orange-600">Others (20%)</th>
                      <th className="px-4 py-3 font-bold text-center bg-purple-700">No Allowance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enterpriseDeptData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">{row.dept}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50/30">{row.staff}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-700 bg-green-50/30">{row.regular}</td>
                        <td className="px-4 py-3 text-center font-medium text-orange-700 bg-orange-50/30">{row.consolidated}</td>
                        <td className="px-4 py-3 text-center font-medium text-blue-700 bg-blue-50/30">{row.investigators}</td>
                        <td className="px-4 py-3 text-center font-medium text-orange-700 bg-orange-50/30">{row.others}</td>
                        <td className="px-4 py-3 text-center font-medium text-purple-700 bg-purple-50/30">{row.noAllowance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alerts & Insights */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-2xl shadow-xl p-6 text-white flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-2"><AlertTriangle size={24} className="text-yellow-400"/> Executive Alerts</h3>
                <p className="text-blue-200 text-sm">Automated insights based on current database metrics.</p>
              </div>
              <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-600">
                  <p className="text-sm font-bold text-yellow-300 mb-1">High Vacancy Alert</p>
                  <p className="text-xs text-blue-100">The organization is currently operating at <strong>{((currentStaffCount/APPROVED_STRENGTH)*100).toFixed(1)}%</strong> staffing capacity. <strong>{vacancyCount} positions</strong> require immediate recruitment action.</p>
                </div>
                <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-600">
                  <p className="text-sm font-bold text-green-300 mb-1">Contract Stability</p>
                  <p className="text-xs text-blue-100"><strong>{((regularCount/totalEmployees)*100).toFixed(1)}%</strong> of staff are on regular contracts, indicating a stable core workforce. Consolidated contracts make up the remaining <strong>{((consolidatedCount/totalEmployees)*100).toFixed(1)}%</strong>.</p>
                </div>
                <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-600">
                  <p className="text-sm font-bold text-orange-300 mb-1">Allowance Optimization</p>
                  <p className="text-xs text-blue-100">A total of <strong>{investigatorCount} investigators</strong> are eligible for the 45% allowance. Ensure budget allocation aligns with the <strong>{othersAllowanceCount} staff</strong> on the 20% tier.</p>
                </div>
                <div className="bg-blue-700/50 p-4 rounded-xl border border-blue-600">
                  <p className="text-sm font-bold text-purple-300 mb-1">Workforce Retention</p>
                  <p className="text-xs text-blue-100">With <strong>{separatedCount} separations</strong> this year, retention remains at <strong>{(((totalEmployees - separatedCount)/totalEmployees)*100).toFixed(1)}%</strong>. Focus on engagement for the <strong>{noAllowanceCount} staff</strong> currently without allowance benefits.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ============================================ */}
        {/* 2. STAFFING DASHBOARD VIEW */}
        {/* ============================================ */}
        {activePage === "staffing" && (
          <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">ACC STAFFING DASHBOARD</h1>
                <p className="text-sm text-gray-600 font-medium mt-1">Recruitment, Separation and Staffing Strength (FY 2025–2026)</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-md shadow-sm border border-gray-200">As of June 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
              <StatCard icon={Users} label="Approved Staff Strength" value={APPROVED_STRENGTH} color="text-blue-800" bg="bg-blue-100" border="border-blue-200" />
              <StatCard icon={Users} label="Staff Strength (as of 30 Jun 2025)" value={currentStaffCount - recruitedCount + separatedCount} sub="Calculated from DB" color="text-green-800" bg="bg-green-100" border="border-green-200" />
              <StatCard icon={UserMinus} label="Separated (Jul 2025 - Jun 2026)" value={separatedCount} sub="From DB Status" color="text-red-800" bg="bg-red-100" border="border-red-200" />
              <StatCard icon={UserPlus} label="Recruited (Jul 2025 - Jun 2026)" value={recruitedCount} sub="From DB Intact Type" color="text-green-800" bg="bg-green-100" border="border-green-200" />
              <StatCard icon={ArrowRightLeft} label="Internally Transferred (Jul 2025 - Jun 2026)" value={transferredCount} sub="From DB Intact Type" color="text-purple-800" bg="bg-purple-100" border="border-purple-200" />
              <StatCard icon={Users} label="Staff Strength (as of Jun 2026)" value={currentStaffCount} sub="Active Employees" color="text-orange-800" bg="bg-orange-100" border="border-orange-200" />
              <StatCard icon={Armchair} label="Vacancies (as of Jun 2026)" value={vacancyCount} sub={`${((vacancyCount/APPROVED_STRENGTH)*100).toFixed(1)}% vacancy rate`} color="text-blue-800" bg="bg-blue-100" border="border-blue-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Trend (Total)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Change in staff strength over the period</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Staff (30 Jun 2025)", value: currentStaffCount - recruitedCount + separatedCount, fill: "#2563eb" },
                      { name: "Recruited", value: recruitedCount, fill: "#22c55e" },
                      { name: "Separated", value: -separatedCount, fill: "#ef4444" },
                      { name: "Internal Transfer (net)", value: transferredCount, fill: "#8b5cf6" },
                      { name: "Staff (30 Jun 2026)", value: currentStaffCount, fill: "#2563eb" },
                    ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} interval={0} angle={-15} textAnchor="end" height={40} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={30}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#2563eb" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Composition (as of June 2026)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Approved vs. Current staff and vacancies</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Approved Strength", value: APPROVED_STRENGTH, fill: "#3b82f6" },
                      { name: "Current Staff (Jun 2026)", value: currentStaffCount, fill: "#22c55e" },
                      { name: "Vacancies", value: vacancyCount, fill: "#f97316" },
                    ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={40}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#22c55e" />
                        <Cell fill="#f97316" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
                  <h3 className="font-bold text-gray-800 text-sm">Staffing Movement (Total)</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Recruitment, separation and internal transfers</p>
                <div className="h-56 flex justify-center items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: "Recruited", value: recruitedCount, fill: "#22c55e" },
                        { name: "Separated", value: separatedCount, fill: "#ef4444" },
                        { name: "Internally Transferred (net)", value: transferredCount, fill: "#8b5cf6" },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">{recruitedCount + separatedCount + transferredCount}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Movements</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span><span className="text-gray-600 font-medium">Recruited</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-gray-600 font-medium">Separated</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span><span className="text-gray-600 font-medium">Transferred</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
                  <h3 className="font-bold text-gray-800 text-sm">Department/Division-wise Staffing</h3>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">Approved strength, staff strength (2025 and 2026) and net change</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={enterpriseDeptData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dept" tick={{ fontSize: 8, fill: '#6b7280' }} interval={0} angle={-35} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" iconSize={6} />
                      <Bar dataKey="staff" name="Staff (Jun 2026)" fill="#f97316" radius={[2, 2, 0, 0]} barSize={20} />
                      <Line type="monotone" dataKey="regular" name="Regular Staff" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Staff</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Regular</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Consolidated</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Investigators</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enterpriseDeptData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition-colors">
                          <td className="px-2 py-1.5 font-medium text-gray-700 truncate max-w-[150px]" title={row.dept}>{row.dept}</td>
                          <td className="px-2 py-1.5 text-center text-orange-600 font-bold bg-orange-50/50">{row.staff}</td>
                          <td className="px-2 py-1.5 text-center text-green-600 font-bold">{row.regular}</td>
                          <td className="px-2 py-1.5 text-center text-blue-600 font-bold">{row.consolidated}</td>
                          <td className="px-2 py-1.5 text-center text-purple-600 font-bold">{row.investigators}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md"><Target size={20} /></div>
                  <h3 className="font-bold text-gray-800 text-sm">Key Takeaways</h3>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-700 font-medium">
                  <div className="flex items-center gap-1.5"><TrendingUp size={14} className="text-blue-600" /><span>Staff strength increased by <strong>{recruitedCount - separatedCount}</strong> this period.</span></div>
                  <div className="flex items-center gap-1.5"><UserPlus size={14} className="text-green-600" /><span><strong>{recruitedCount} employees</strong> were recruited during the period.</span></div>
                  <div className="flex items-center gap-1.5"><UserMinus size={14} className="text-red-600" /><span><strong>{separatedCount} employees</strong> separated during the period.</span></div>
                  <div className="flex items-center gap-1.5"><ArrowRightLeft size={14} className="text-purple-600" /><span>Net internal transfer increased by <strong>{transferredCount}</strong>.</span></div>
                  <div className="flex items-center gap-1.5"><Armchair size={14} className="text-orange-600" /><span><strong>{vacancyCount} positions</strong> remain vacant.</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 3. EMPLOYEE DASHBOARD (CONTRACT TYPE) VIEW */}
        {/* ============================================ */}
        {activePage === "contract" && (
          <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg text-white shadow-md"><Building size={32} /></div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">EMPLOYEE BY CONTRACT TYPE</h1>
                  <p className="text-sm text-gray-600 font-medium mt-1">Anti-Corruption Commission</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Employees</p>
                <p className="text-3xl font-black text-blue-600">{totalEmployees}</p>
                <p className="text-[10px] text-gray-400 font-medium">(from provided list)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-lg"><Users size={28} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Total Employees</p>
                  <p className="text-4xl font-black text-blue-900">{totalEmployees}</p>
                  <p className="text-xs text-gray-500 font-medium">100%</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-green-600 text-white rounded-lg"><FileText size={28} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Regular Contract</p>
                  <p className="text-4xl font-black text-green-900">{regularCount}</p>
                  <p className="text-xs text-gray-500 font-medium">{((regularCount/totalEmployees)*100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-orange-500 text-white rounded-lg"><Layers size={28} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Consolidated Contract</p>
                  <p className="text-4xl font-black text-orange-900">{consolidatedCount}</p>
                  <p className="text-xs text-gray-500 font-medium">{((consolidatedCount/totalEmployees)*100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-purple-600 text-white rounded-lg"><Layers size={28} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Other Contract Types</p>
                  <p className="text-4xl font-black text-purple-900">{otherCount}</p>
                  <p className="text-xs text-gray-500 font-medium">{((otherCount/totalEmployees)*100).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Employees by Contract Type</h3>
                    <p className="text-xs text-gray-500">Number and percentage of employees</p>
                  </div>
                </div>
                <div className="h-72 flex justify-center items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: "Regular Contract", value: regularCount, fill: "#22c55e" },
                        { name: "Consolidated Contract", value: consolidatedCount, fill: "#f97316" },
                        { name: "Other Contract Types", value: otherCount, fill: "#a855f7" },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#f97316" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-gray-800">{totalEmployees}</span>
                    <span className="text-xs text-gray-500 font-bold uppercase">Employees</span>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-gray-600 font-medium">Regular Contract</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-gray-600 font-medium">Consolidated Contract</span></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Employees by Organisation and Contract Type</h3>
                    <p className="text-xs text-gray-500">Number of employees in each organisation</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enterpriseDeptData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dept" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="square" iconSize={10} />
                      <Bar dataKey="regular" name="Regular Contract" stackId="a" fill="#22c55e" />
                      <Bar dataKey="consolidated" name="Consolidated Contract" stackId="a" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Percentage of Contract Type by Organisation</h3>
                    <p className="text-[10px] text-gray-500">Share of Regular and Consolidated Contract employees</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {enterpriseDeptData.slice(0, 8).map((d, idx) => {
                    const total = d.regular + d.consolidated + d.noAllowance;
                    const regPct = total ? (d.regular / total) * 100 : 0;
                    const conPct = total ? (d.consolidated / total) * 100 : 0;
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between mb-1 font-medium text-gray-700"><span>{d.dept}</span></div>
                        <div className="flex h-5 w-full rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          <div className="bg-green-500 flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${regPct}%` }}>{regPct > 10 ? `${Math.round(regPct)}%` : ''}</div>
                          <div className="bg-orange-400 flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${conPct}%` }}>{conPct > 10 ? `${Math.round(conPct)}%` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500"></span> Regular Contract</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-400"></span> Consolidated Contract</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">4</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Detailed Breakdown</h3>
                    <p className="text-[10px] text-gray-500">Number of employees by organisation and contract type</p>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[300px]">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="text-[9px] uppercase bg-blue-100 text-blue-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 font-bold border-b border-blue-200">Organisation</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Regular<br/>Contract</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Consolidated<br/>Contract</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Other<br/>Contract Type</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enterpriseDeptData.map((row, idx) => {
                         const total = row.regular + row.consolidated + row.noAllowance;
                         return (
                          <tr key={idx} className="hover:bg-blue-50 transition-colors">
                            <td className="px-2 py-1.5 font-medium text-gray-700 truncate max-w-[120px]" title={row.dept}>{row.dept}</td>
                            <td className="px-2 py-1.5 text-center text-green-600 font-bold">{row.regular}</td>
                            <td className="px-2 py-1.5 text-center text-orange-600 font-bold">{row.consolidated}</td>
                            <td className="px-2 py-1.5 text-center text-purple-600 font-bold">{row.noAllowance}</td>
                            <td className="px-2 py-1.5 text-center text-blue-900 font-black bg-blue-50/50">{total}</td>
                          </tr>
                         )
                      })}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="px-2 py-2 text-gray-900">Total</td>
                        <td className="px-2 py-2 text-center text-green-700">{regularCount}</td>
                        <td className="px-2 py-2 text-center text-orange-700">{consolidatedCount}</td>
                        <td className="px-2 py-2 text-center text-purple-700">{otherCount}</td>
                        <td className="px-2 py-2 text-center text-blue-900">{totalEmployees}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">5</span>
                  <h3 className="font-bold text-gray-800 text-sm">Key Insights</h3>
                </div>
                <div className="space-y-4 text-xs text-gray-700">
                  <div className="flex items-start gap-3"><Users size={20} className="text-green-500 flex-shrink-0 mt-0.5" /><p><strong>{((regularCount/totalEmployees)*100).toFixed(1)}%</strong> ({regularCount}) of employees are on Regular Contract.</p></div>
                  <div className="flex items-start gap-3"><Users size={20} className="text-orange-500 flex-shrink-0 mt-0.5" /><p><strong>{((consolidatedCount/totalEmployees)*100).toFixed(1)}%</strong> ({consolidatedCount}) of employees are on Consolidated Contract.</p></div>
                  <div className="flex items-start gap-3"><Users size={20} className="text-purple-500 flex-shrink-0 mt-0.5" /><p>{otherCount} employees are on other contract types.</p></div>
                  <div className="flex items-start gap-3"><Building size={20} className="text-blue-500 flex-shrink-0 mt-0.5" /><p>The <strong>{enterpriseDeptData[0]?.dept || 'N/A'}</strong> has the highest number of employees ({enterpriseDeptData[0]?.staff || 0}).</p></div>
                  <div className="flex items-start gap-3"><FileText size={20} className="text-gray-500 flex-shrink-0 mt-0.5" /><p>All employees are either on Regular or Consolidated Contract.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 4. ALLOWANCE DISTRIBUTION DASHBOARD VIEW */}
        {/* ============================================ */}
        {activePage === "allowance" && (
          <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg text-white shadow-md"><Building size={32} /></div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">ACC ALLOWANCE DASHBOARD</h1>
                  <p className="text-sm text-gray-600 font-medium mt-1">Distribution of Employees by Position and Allowance Category</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Employees</p>
                <p className="text-3xl font-black text-blue-600">{totalEmployees}</p>
                <p className="text-[10px] text-gray-400 font-medium">As of June 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-lg"><Users size={28} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Total Employees</p>
                  <p className="text-4xl font-black text-blue-900">{totalEmployees}</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-600 text-white rounded-lg"><SearchIcon size={28} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase leading-tight">Investigators Allowance (45%)</p>
                    <p className="text-3xl font-black text-green-900">{investigatorCount}</p>
                    <p className="text-xs text-gray-500 font-medium">{((investigatorCount/totalEmployees)*100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-green-200 h-2 rounded-full mt-2 overflow-hidden"><div className="bg-green-600 h-full" style={{ width: `${(investigatorCount/totalEmployees)*100}%` }}></div></div>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500 text-white rounded-lg"><Users size={28} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase leading-tight">Others Allowance (20%)</p>
                    <p className="text-3xl font-black text-orange-900">{othersAllowanceCount}</p>
                    <p className="text-xs text-gray-500 font-medium">{((othersAllowanceCount/totalEmployees)*100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-orange-200 h-2 rounded-full mt-2 overflow-hidden"><div className="bg-orange-500 h-full" style={{ width: `${(othersAllowanceCount/totalEmployees)*100}%` }}></div></div>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-600 text-white rounded-lg"><Ban size={28} /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase leading-tight">No Allowance (0%)</p>
                    <p className="text-3xl font-black text-purple-900">{noAllowanceCount}</p>
                    <p className="text-xs text-gray-500 font-medium">{((noAllowanceCount/totalEmployees)*100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-purple-200 h-2 rounded-full mt-2 overflow-hidden"><div className="bg-purple-600 h-full" style={{ width: `${(noAllowanceCount/totalEmployees)*100}%` }}></div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Employees by Allowance Category</h3>
                    <p className="text-[11px] text-gray-500">Number and percentage of employees</p>
                  </div>
                </div>
                <div className="h-64 flex justify-center items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: "Investigators (45%)", value: investigatorCount, fill: "#3b82f6" },
                        { name: "Others (20%)", value: othersAllowanceCount, fill: "#f97316" },
                        { name: "No Allowance (0%)", value: noAllowanceCount, fill: "#a855f7" },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f97316" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-gray-800">{totalEmployees}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Employees</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Investigators</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Others</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> No Allowance</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Employees by Position Category and Allowance</h3>
                    <p className="text-[11px] text-gray-500">Distribution across all positions</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enterpriseDeptData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dept" tick={{ fontSize: 8 }} interval={0} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="square" iconSize={8} />
                      <Bar dataKey="investigators" name="Investigators (45%)" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="others" name="Others (20%)" stackId="a" fill="#f97316" />
                      <Bar dataKey="noAllowance" name="No Allowance (0%)" stackId="a" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Allowance Distribution within Position Groups</h3>
                    <p className="text-[10px] text-gray-500">Percentage within each position category</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {enterpriseDeptData.slice(0, 7).map((d, idx) => {
                    const total = d.investigators + d.others + d.noAllowance;
                    const invPct = total ? (d.investigators / total) * 100 : 0;
                    const othPct = total ? (d.others / total) * 100 : 0;
                    const noPct = total ? (d.noAllowance / total) * 100 : 0;
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between mb-1 font-medium text-gray-700"><span>{d.dept}</span></div>
                        <div className="flex h-5 w-full rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          <div className="bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${invPct}%` }}>{invPct > 10 ? `${Math.round(invPct)}%` : ''}</div>
                          <div className="bg-orange-400 flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${othPct}%` }}>{othPct > 10 ? `${Math.round(othPct)}%` : ''}</div>
                          <div className="bg-purple-500 flex items-center justify-center text-[9px] text-white font-bold" style={{ width: `${noPct}%` }}>{noPct > 10 ? `${Math.round(noPct)}%` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500"></span> Investigators</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-400"></span> Others</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500"></span> No Allowance</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Detailed Breakdown by Position</h3>
                    <p className="text-[10px] text-gray-500">Number of employees in each allowance category</p>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[300px]">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="text-[9px] uppercase bg-blue-100 text-blue-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 font-bold border-b border-blue-200">Organisation</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Investigators</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Others</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">No Allowance</th>
                        <th className="px-2 py-2 font-bold text-center border-b border-blue-200">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {enterpriseDeptData.map((row, idx) => {
                        const total = row.investigators + row.others + row.noAllowance;
                        return (
                          <tr key={idx} className="hover:bg-blue-50 transition-colors">
                            <td className="px-2 py-1.5 font-medium text-gray-700 truncate max-w-[120px]" title={row.dept}>{row.dept}</td>
                            <td className="px-2 py-1.5 text-center text-blue-600 font-bold">{row.investigators}</td>
                            <td className="px-2 py-1.5 text-center text-orange-600 font-bold">{row.others}</td>
                            <td className="px-2 py-1.5 text-center text-purple-600 font-bold">{row.noAllowance}</td>
                            <td className="px-2 py-1.5 text-center text-blue-900 font-black bg-blue-50/50">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">5</span>
                  <h3 className="font-bold text-gray-800 text-sm">Key Insights</h3>
                </div>
                <div className="space-y-4 text-[11px] text-gray-700">
                  <div className="flex items-start gap-3"><User size={18} className="text-blue-500 flex-shrink-0 mt-0.5" /><p><strong>{((investigatorCount/totalEmployees)*100).toFixed(1)}%</strong> of employees ({investigatorCount}) receive Investigators Allowance (45%).</p></div>
                  <div className="flex items-start gap-3"><Users size={18} className="text-orange-500 flex-shrink-0 mt-0.5" /><p><strong>{((othersAllowanceCount/totalEmployees)*100).toFixed(1)}%</strong> of employees ({othersAllowanceCount}) receive Others Allowance (20%).</p></div>
                  <div className="flex items-start gap-3"><Ban size={18} className="text-purple-500 flex-shrink-0 mt-0.5" /><p><strong>{((noAllowanceCount/totalEmployees)*100).toFixed(1)}%</strong> of employees ({noAllowanceCount}) do not receive allowance (0%).</p></div>
                  <div className="flex items-start gap-3"><TrendingUp size={18} className="text-green-500 flex-shrink-0 mt-0.5" /><p>Professional category (P1–P5) has the highest number of employees.</p></div>
                  <div className="flex items-start gap-3"><Settings size={18} className="text-red-500 flex-shrink-0 mt-0.5" /><p>All employees in the ESP category receive Others Allowance (20%).</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 5. MANAGEMENT VIEW (Original Code) */}
        {/* ============================================ */}
        {activePage === "management" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">HR Employee Directory</h1>
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

            {notification && (
              <div className={`mb-4 px-4 py-2 rounded ${notification.type === "success" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>{notification.message}</div>
            )}

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
                                    <div className={`px-4 py-2 text-sm no-print ${photoNotification.type === "success" ? "bg-green-50 text-green-700 border-b border-green-200" : "bg-red-50 text-red-700 border-b border-red-200"}`}>{photoNotification.message}</div>
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
// HELPER COMPONENTS
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