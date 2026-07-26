"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Eye,
  EyeOff,
  Search,
  Loader2,
  RefreshCw,
  Database,
  Pencil,
  Save,
  X,
  Upload,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  Briefcase,
  GraduationCap,
  Users,
  FileText,
  Award,
  Clock,
  UserCheck,
  Hash,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  Edit,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

// ============================================
// DROPDOWN OPTIONS (unchanged)
// ============================================
const GENDER_OPTIONS = ["Male", "Female"];
const POSITION_TYPE_OPTIONS = ["Managerial", "Specialist"];

const DEGREE_OPTIONS = [
  "PHD Degree",
  "Master Degree",
  "Bachelor Degree",
  "PG Diploma",
  "High School",
  "Non Formal Education",
  "Certificate",
];

const MOG_OPTIONS = [
  "Executive and Specialist Services Group",
  "Planning and Research Services Group",
  "Administration and Support Services Group",
  "Human Resource Services Group",
  "Legal and Legislative Services Group",
  "Finance and Audit Services Group",
  "Information Communication and Technology Services Group",
];

const SUB_GROUP_OPTIONS = [
  "Executive Services",
  "Research Services",
  "Secretarial Services",
  "HR Management & Development Services",
  "Integrity & Promotion Services",
  "Administration Services",
  "Legal Services",
  "Specialist Services",
  "Planning Services",
  "Finance, Accounting & Budgets Services",
  "Property and Management Services",
  "ICT Services",
  "Media Services",
  "Statistical Services",
];

const SUPER_STRUCTURE_OPTIONS = [
  "EX & ES Service",
  "Administration Service",
  "Technical Service",
  "Education Service",
  "Finance Service",
];

const CURRENT_STATUS_OPTIONS = [
  "Active",
  "Study Leave",
  "Maternity Leave",
  "EOL",
  "Deputation",
  "Secondment",
  "Separated",
];

const INTACT_TYPE_OPTIONS = [
  "Intact type",
  "Lateral Transfer",
  "Handpick",
  "Single Window Recruitment",
];

// ============================================
// PAGE COMPONENT
// ============================================
export default function HREmployeePage() {
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

  // ---------- Crop positioning state ----------
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [currentCidForUpload, setCurrentCidForUpload] = useState(null);
  // Track whether we're editing an existing photo or uploading a new one
  const [isEditingExistingPhoto, setIsEditingExistingPhoto] = useState(false);

  // ================== LOAD, SYNC, FETCH (unchanged) ==================
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
      console.error("Sync error:", err);
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
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCidInputChange = (e) => {
    setCidInput(e.target.value);
  };

  const handleCidKeyDown = (e) => {
    if (e.key === "Enter") fetchEmployeeByCID(cidInput);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleView = (cid) => {
    if (expandedCid === cid) {
      setExpandedCid(null);
      setEditingCid(null);
    } else {
      setExpandedCid(cid);
      setEditingCid(null);
    }
  };

  // ================== EDIT START ==================
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

  const cancelEdit = () => {
    setEditingCid(null);
    setEditData({});
  };

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

  // ---------- Photo Positioning with react-easy-crop ----------
  const triggerFilePicker = (cid) => {
    setCurrentCidForUpload(cid);
    setIsEditingExistingPhoto(false);
    fileInputRef.current?.click();
  };

  // ✅ New: Edit existing photo
  const editExistingPhoto = (cid, existingPhotoBase64) => {
    if (!existingPhotoBase64) {
      showNotification("No photo to edit. Please upload one first.", "error");
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
    if (!file) {
      showNotification("Please select a photo", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Photo must be less than 5MB", "error");
      return;
    }

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

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSavePositionedPhoto = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      showNotification("Please position the photo first", "error");
      return;
    }

    setUploadingPhoto(true);
    try {
      const outputSize = 300;
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");

      const { x, y, width, height } = croppedAreaPixels;
      ctx.drawImage(
        image,
        x,
        y,
        width,
        height,
        0,
        0,
        outputSize,
        outputSize
      );

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
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.cidNumber === currentCidForUpload ? data.employee : emp
          )
        );
        showNotification(
          isEditingExistingPhoto ? "Photo repositioned successfully" : "Photo uploaded successfully",
          "success"
        );
        setCropModalOpen(false);
        setImageSrc(null);
        setCroppedAreaPixels(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const errorData = await res.json();
        showNotification(errorData.error || "Upload failed", "error");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      showNotification("Error uploading photo", "error");
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

  useEffect(() => {
    loadFromDatabase();
  }, []);

  // ================== FILTER & SORT ==================
  const filtered = employees.filter(
    (item) =>
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

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">HR Employee Management</h1>
          <div className="flex gap-2">
            <button
              onClick={syncEmployees}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
            >
              {syncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Sync from HR
                </>
              )}
            </button>
            <button
              onClick={loadFromDatabase}
              disabled={loadingAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {loadingAll ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              Load from DB
            </button>
            {employees.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition shadow-sm"
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-4 px-4 py-2 rounded ${
              notification.type === "success"
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Search by CID Input */}
        <div className="bg-white shadow rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Search Employee by CID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cidInput}
                  onChange={handleCidInputChange}
                  onKeyDown={handleCidKeyDown}
                  placeholder="e.g. 12008001606"
                  className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => fetchEmployeeByCID(cidInput)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    "Searching..."
                  ) : (
                    <>
                      <Search size={16} /> Fetch Employee
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search employees..."
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
            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">
              <Users size={14} className="mr-1" />
              Total: {employees.length} employees
            </span>
          </div>
        </div>

        {/* Table (unchanged) */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium uppercase w-12">Photo</th>
                <th
                  onClick={() => handleSort("fullName")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition"
                >
                  Full Name
                </th>
                <th
                  onClick={() => handleSort("cidNumber")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition"
                >
                  CID Number
                </th>
                <th
                  onClick={() => handleSort("positionTitle")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none hover:bg-gray-100 transition"
                >
                  Position
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Department & Division</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.length > 0 ? (
                paginated.map((item, index) => {
                  const isExpanded = expandedCid === item.cidNumber;
                  const isEditing = editingCid === item.cidNumber;
                  return (
                    <React.Fragment key={item.cidNumber}>
                      <tr className="hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-gray-200">
                            {item.passportPhoto ? (
                              <img
                                src={item.passportPhoto}
                                alt={item.fullName}
                                className="w-full h-full object-cover"
                              />
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
                            <span className="ml-1 text-xs text-gray-500">
                              ({item.positionLevel}
                              {item.subLevel ? `-${item.subLevel}` : ""})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div>
                            {item.department && (
                              <span className="block text-gray-800">{item.department}</span>
                            )}
                            {item.division && (
                              <span className="block text-xs text-gray-500">{item.division}</span>
                            )}
                            {!item.department && !item.division && (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">
                            {item.email}
                          </a>
                        </td>
                        <td className="px-6 py-3 text-sm flex gap-2">
                          <button
                            onClick={() => toggleView(item.cidNumber)}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-blue-500 hover:text-blue-500 transition"
                          >
                            {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                            {isExpanded ? "Close" : "View"}
                          </button>
                          <button
                            onClick={() => removeEmployee(item.cidNumber)}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </td>
                      </tr>

                      {/* Expanded details row (unchanged) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" className="px-6 py-6 bg-blue-50/50">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              {/* Header: Photo + Name + Badges + Edit */}
                              <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                                <div className="flex-shrink-0">
                                  {item.passportPhoto ? (
                                    <img
                                      src={item.passportPhoto}
                                      alt="Passport"
                                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                                    />
                                  ) : (
                                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-md">
                                      <User className="w-10 h-10 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-gray-900">{item.fullName}</h3>
                                  <p className="text-sm text-gray-600">CID: <span className="font-mono">{item.cidNumber}</span></p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {item.positionTitle || "N/A"}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {item.agency || "N/A"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm"
                                  >
                                    <Pencil size={16} /> Edit HR Data
                                  </button>
                                </div>
                              </div>

                              {/* Body: Edit or Display (unchanged) */}
                              {isEditing ? (
                                <div className="p-6">
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-lg">Edit HR Fields</h4>
                                    <button
                                      onClick={cancelEdit}
                                      className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-100"
                                    >
                                      <X size={14} /> Cancel
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectField
                                      label="Gender"
                                      value={editData.gender || ""}
                                      options={GENDER_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, gender: val })}
                                    />
                                    <InputField
                                      label="Parent Agency"
                                      value={editData.parentAgency || "Anti-Corruption Commission"}
                                      onChange={(val) => setEditData({ ...editData, parentAgency: val })}
                                    />
                                    <SelectField
                                      label="MoG"
                                      value={editData.mog || ""}
                                      options={MOG_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, mog: val })}
                                    />
                                    <SelectField
                                      label="Sub Group"
                                      value={editData.subGroup || ""}
                                      options={SUB_GROUP_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, subGroup: val })}
                                    />
                                    <SelectField
                                      label="Super Structure"
                                      value={editData.superStructure || ""}
                                      options={SUPER_STRUCTURE_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, superStructure: val })}
                                    />
                                    <SelectField
                                      label="Position Type"
                                      value={editData.positionType || ""}
                                      options={POSITION_TYPE_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, positionType: val })}
                                    />
                                    <SelectField
                                      label="Degree"
                                      value={editData.degree || ""}
                                      options={DEGREE_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, degree: val })}
                                    />
                                    <InputField
                                      label="Area of Study"
                                      value={editData.qualification || ""}
                                      onChange={(val) => setEditData({ ...editData, qualification: val })}
                                    />
                                    <SelectField
                                      label="Current Status"
                                      value={editData.currentStatus || "Active"}
                                      options={CURRENT_STATUS_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, currentStatus: val })}
                                    />
                                    <div>
                                      <label className="text-xs font-medium text-gray-500 block">Date of Joining ACC</label>
                                      <input
                                        type="date"
                                        className="w-full border rounded px-2 py-1 text-sm"
                                        value={editData.dateOfJoining || ""}
                                        onChange={(e) =>
                                          setEditData({ ...editData, dateOfJoining: e.target.value })
                                        }
                                      />
                                    </div>
                                    <SelectField
                                      label="Intact Type"
                                      value={editData.intactType || ""}
                                      options={INTACT_TYPE_OPTIONS}
                                      onChange={(val) => setEditData({ ...editData, intactType: val })}
                                    />
                                    <div>
                                      <label className="text-xs font-medium text-gray-500 block">Remarks</label>
                                      <textarea
                                        className="w-full border rounded px-2 py-1 text-sm"
                                        rows="2"
                                        value={editData.remarks || ""}
                                        onChange={(e) =>
                                          setEditData({ ...editData, remarks: e.target.value })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-4 flex justify-end">
                                    <button
                                      onClick={() => saveEdit(item.cidNumber)}
                                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                    >
                                      <Save size={16} /> Save Changes
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-4">
                                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">
                                        Personal Information
                                      </h4>
                                      <InfoItem icon={User} label="Gender" value={item.gender} />
                                      <InfoItem icon={Calendar} label="Date of Birth" value={item.dateOfBirth} />
                                      <InfoItem icon={Phone} label="Mobile" value={item.mobile} />
                                      <InfoItem icon={Mail} label="Email" value={item.email} isLink={`mailto:${item.email}`} />

                                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1 mt-2">
                                        Employment Details
                                      </h4>
                                      <InfoItem icon={Briefcase} label="Employee Number" value={item.employeeNumber} />
                                      <InfoItem icon={Award} label="Position Level" value={`${item.positionLevel || ""}${item.subLevel ? `-${item.subLevel}` : ""}`} />
                                      <InfoItem icon={Calendar} label="Appointment Date" value={item.dateOfAppointment} />
                                      <InfoItem icon={Calendar} label="Last Promotion" value={item.lastDateOfPromotion} />
                                      <InfoItem icon={Users} label="Employee Type" value={item.empType} />
                                    </div>

                                    <div className="space-y-4">
                                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">
                                        HR Custom Fields
                                      </h4>
                                      <InfoItem icon={Building} label="Parent Agency" value={item.parentAgency || "Anti-Corruption Commission"} />
                                      <InfoItem icon={MapPin} label="MoG" value={item.mog} />
                                      <InfoItem icon={FileText} label="Sub Group" value={item.subGroup} />
                                      <InfoItem icon={FileText} label="Super Structure" value={item.superStructure} />
                                      <InfoItem icon={Briefcase} label="Position Type" value={item.positionType} />
                                      <InfoItem icon={GraduationCap} label="Degree" value={item.degree} />
                                      <InfoItem icon={GraduationCap} label="Area of Study" value={item.qualification} />
                                      <InfoItem icon={UserCheck} label="Current Status" value={item.currentStatus} />
                                      <InfoItem icon={Calendar} label="Date of Joining ACC" value={item.dateOfJoining} />
                                      <InfoItem icon={Hash} label="Intact Type" value={item.intactType} />
                                      <InfoItem icon={FileText} label="Remarks" value={item.remarks} />

                                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-1 mt-2">
                                        Agency Path
                                      </h4>
                                      <InfoItem icon={MapPin} label="Full Agency Path" value={item.fullAgencyPath} />
                                      <InfoItem icon={Building} label="Department" value={item.department} />
                                      <InfoItem icon={Building} label="Division" value={item.division} />
                                    </div>
                                  </div>

                                  {/* ✅ UPDATED: Photo upload with Edit & Replace options */}
                                  <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-4 flex-wrap">
                                      <span className="text-sm font-medium text-gray-700">Photo:</span>

                                      {/* Hidden file input */}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        disabled={uploadingPhoto}
                                        onChange={handleFileSelect}
                                      />

                                      {/* If photo exists, show "Edit" and "Replace" buttons */}
                                      {item.passportPhoto ? (
                                        <div className="flex items-center gap-3">
                                          {/* Small preview of current photo */}
                                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300 flex-shrink-0">
                                            <img
                                              src={item.passportPhoto}
                                              alt="Current"
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <button
                                            onClick={() => editExistingPhoto(item.cidNumber, item.passportPhoto)}
                                            disabled={uploadingPhoto}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition"
                                          >
                                            <Edit size={14} />
                                            Edit Photo
                                          </button>
                                          <button
                                            onClick={() => triggerFilePicker(item.cidNumber)}
                                            disabled={uploadingPhoto}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm disabled:opacity-50 transition"
                                          >
                                            <Upload size={14} />
                                            Replace
                                          </button>
                                        </div>
                                      ) : (
                                        /* If no photo, show "Upload" button */
                                        <button
                                          onClick={() => triggerFilePicker(item.cidNumber)}
                                          disabled={uploadingPhoto}
                                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition"
                                        >
                                          {uploadingPhoto ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : (
                                            <Upload size={16} />
                                          )}
                                          Upload Photo
                                        </button>
                                      )}
                                    </div>
                                    {/* Show "Current photo uploaded" text only if photo exists */}
                                    {item.passportPhoto && (
                                      <p className="text-xs text-gray-500 mt-2">Current photo uploaded. Click "Edit Photo" to reposition or "Replace" to upload a new one.</p>
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

      {/* ======== POSITION MODAL (using react-easy-crop) ======== */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CropIcon size={20} className="text-blue-600" />
                {isEditingExistingPhoto ? "Reposition Photo" : "Position Photo"}
              </h2>
              <button
                onClick={closeCropModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="relative bg-gray-100 rounded-lg p-4" style={{ height: 400 }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  objectFit="horizontal-cover"
                />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <ZoomOut size={18} className="text-gray-500" />
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <ZoomIn size={18} className="text-gray-500" />
                <span className="text-xs text-gray-500 ml-2 w-12">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Drag the image to center the face within the circular frame. Use the slider to zoom in/out.
              </p>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeCropModal}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePositionedPhoto}
                disabled={uploadingPhoto}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {isEditingExistingPhoto ? "Save Changes" : "Save"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS (unchanged)
// ============================================

function DisplayField({ label, value, isLink }) {
  if (!value) return null;
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block">{label}</label>
      {isLink ? (
        <a href={isLink} className="text-sm text-blue-600 hover:underline">
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-800 break-words">{value}</p>
      )}
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block">{label}</label>
      <input
        type="text"
        className="w-full border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block">{label}</label>
      <select
        className="w-full border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, isLink }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
        {isLink ? (
          <a href={isLink} className="text-sm text-blue-600 hover:underline block">
            {value}
          </a>
        ) : (
          <p className="text-sm text-gray-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}