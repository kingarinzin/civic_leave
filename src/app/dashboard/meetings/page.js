"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  XCircle,
  Eye,
  Trash2,
  ChevronUp,
  Plus,
  Download,
  Pencil,
  X,
  FileText,
  Calendar,
  Users,
  File,
  Eye as ViewIcon,
  Mail,
  Hash,
  User as UserIcon,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SendNotificationModal from "@/components/SendNotificationModal";

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

const YEAR_OPTIONS = [
  "2028", "2027", "2026", "2025", "2024", "2023", "2022",
  "2021", "2020", "2019", "2018", "2017", "2016",
];

export default function LogMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Default sort: display_order descending
  const [sortConfig, setSortConfig] = useState({ key: "display_order", direction: "desc" });
  const [viewedItemId, setViewedItemId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [testDocId, setTestDocId] = useState(null);

  // ─── unified send modal ──────────────────────────
  const [sendDocId, setSendDocId] = useState(null);

  // ─── role / whitelist ────────────────────────────
  const [userEmail, setUserEmail] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    setIsAdminUser(isAdmin);

    if (token) {
      try {
        const [, payload] = token.split(".");
        const decoded = JSON.parse(atob(payload));
        setUserEmail(decoded?.email || "");
      } catch {
        // ignore
      }
    }
  }, []);

  const meetingsAllowedEmails = [
    "kwangmo@acc.org.bt",
    "karmawangmo@acc.org.bt",
    "skhando@acc.org.bt",
  ];
  const canManage = isAdminUser || meetingsAllowedEmails.includes(userEmail);

  // ─── Send-to modal state ───────────────────────────
  const [showSendToModal, setShowSendToModal] = useState(false);
  const [sendToDocId, setSendToDocId] = useState(null);
  const [sendToTab, setSendToTab] = useState("all");
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewerFileUrl, setViewerFileUrl] = useState("");
  const [viewerFileName, setViewerFileName] = useState("");

  const [filters, setFilters] = useState({
    documentType: "",
    commission: "",
    year: "",
  });

  const [dropdowns, setDropdowns] = useState({
    documentTypes: [],
    commissions: [],
    departments: [],
    divisions: [],
  });

  const [formData, setFormData] = useState({
    display_order: "",
    document_type: "",
    commission: "",
    year: new Date().getFullYear().toString(),
    date: new Date().toISOString().split("T")[0],
    subject: "",
    file: null,
  });

  const [editFormData, setEditFormData] = useState({
    display_order: "",
    document_type: "",
    commission: "",
    year: "",
    date: "",
    subject: "",
    file: null,
  });
  const [editExistingFile, setEditExistingFile] = useState(null);
  const [editRemoveExisting, setEditRemoveExisting] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState("");

  const showNotification = (message, type = "success") => {
    if (type === "success") {
      setSuccessMessage(message);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSuccessMessage("");
      }, 5000);
    } else {
      setError(message);
      setTimeout(() => setError(""), 5000);
    }
  };

  // ─── Fetch dropdowns ──────────────────────────────
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await fetch("/api/meetings/documents_dropdowns");
        if (!res.ok) throw new Error("Failed to fetch dropdowns");
        const data = await res.json();
        const types = data.documentTypes || [];
        const comms = data.commissions || [];
        setDropdowns({
          documentTypes: types,
          commissions: comms,
          departments: data.departments || [],
          divisions: data.divisions || [],
        });
        if (types.length > 0) {
          setFormData((prev) => ({ ...prev, document_type: types[0].name }));
        }
        if (comms.length > 0) {
          setFormData((prev) => ({ ...prev, commission: comms[0].name }));
        }
      } catch (err) {
        console.error(err);
        showNotification("Failed to load dropdowns", "error");
      }
    };
    fetchDropdowns();
  }, []);

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

  // ─── Fetch all users (for Individuals tab) ────────
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/all-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = (data.users || []).filter((u) => u.isActive !== false);
        setAllUsers(items);
      } else {
        console.error("Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────
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

  const handleView = (doc) => {
    if (editingId) closeEditForm();
    setViewedItemId(viewedItemId === doc.id ? null : doc.id);
  };

  const handleDownload = async (doc) => {
    window.open(doc.file_url, "_blank");
  };

  // ─── Send Email ───────────────────────────────────
  const handleSendEmail = async (docId, testEmail = null) => {
    try {
      setSendingEmail(docId);
      const token = localStorage.getItem("token");
      const body = testEmail ? { testEmail } : {};

      const res = await fetch(`/api/meetings/documents/${docId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        const message = testEmail
          ? `✅ Test email sent to ${testEmail}`
          : `✅ Email sent to ${data.sent || 0} users${data.failed > 0 ? ` (${data.failed} failed)` : ""}`;
        showNotification(message, "success");
        setShowTestEmailModal(false);
        setTestEmailInput("");
        setTestDocId(null);
      } else {
        showNotification(data.error || "Failed to send emails", "error");
      }
    } catch (err) {
      console.error("Send email error:", err);
      showNotification("Error sending emails", "error");
    } finally {
      setSendingEmail(null);
    }
  };

  const openTestEmailModal = (docId) => {
    setTestDocId(docId);
    setShowTestEmailModal(true);
    setTestEmailInput("");
  };

  const handleTestEmailSubmit = () => {
    if (!testEmailInput || !testEmailInput.includes("@")) {
      showNotification("Please enter a valid email address", "error");
      return;
    }
    handleSendEmail(testDocId, testEmailInput);
  };

  // ─── Send-to Modal Handlers ──────────────────────
  const openSendToModal = async (docId) => {
    setSendToDocId(docId);
    setSendToTab("all");
    setSelectedDepartments([]);
    setSelectedDivisions([]);
    setSelectedUsers([]);
    setUserSearchTerm("");
    setShowSendToModal(true);
    if (allUsers.length === 0) {
      await fetchAllUsers();
    }
  };

  const closeSendToModal = () => {
    setShowSendToModal(false);
    setSendToDocId(null);
    setSelectedDepartments([]);
    setSelectedDivisions([]);
    setSelectedUsers([]);
    setUserSearchTerm("");
    setSendToTab("all");
  };

  const toggleDepartment = (deptId) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleDivision = (divId) => {
    setSelectedDivisions((prev) =>
      prev.includes(divId) ? prev.filter((id) => id !== divId) : [...prev, divId]
    );
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAllDepartments = () => {
    if (selectedDepartments.length === dropdowns.departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(dropdowns.departments.map((d) => d.id));
    }
  };

  const selectAllDivisions = () => {
    if (selectedDivisions.length === dropdowns.divisions.length) {
      setSelectedDivisions([]);
    } else {
      setSelectedDivisions(dropdowns.divisions.map((d) => d.id));
    }
  };

  const selectAllFilteredUsers = () => {
    const ids = filteredUsers.map((u) => u._id);
    const allSelected = ids.every((id) => selectedUsers.includes(id));
    if (allSelected) {
      setSelectedUsers((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      const merged = new Set([...selectedUsers, ...ids]);
      setSelectedUsers(Array.from(merged));
    }
  };

  const handleSendToSubmit = async () => {
    if (!sendToDocId) return;

    if (sendToTab === "departments" && selectedDepartments.length === 0) {
      showNotification("Please select at least one department", "error");
      return;
    }
    if (sendToTab === "divisions" && selectedDivisions.length === 0) {
      showNotification("Please select at least one division", "error");
      return;
    }
    if (sendToTab === "individuals" && selectedUsers.length === 0) {
      showNotification("Please select at least one individual", "error");
      return;
    }

    if (!confirm("Are you sure you want to send this email?")) return;

    try {
      setSendingEmail(sendToDocId);
      const token = localStorage.getItem("token");

      let body = {};
      if (sendToTab === "departments") {
        body.departmentIds = selectedDepartments;
      } else if (sendToTab === "divisions") {
        body.divisionIds = selectedDivisions;
      } else if (sendToTab === "individuals") {
        body.userIds = selectedUsers;
      }

      const res = await fetch(`/api/meetings/documents/${sendToDocId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        showNotification(
          `✅ Email sent to ${data.sent || 0} users${data.failed > 0 ? ` (${data.failed} failed)` : ""}`,
          "success"
        );
        closeSendToModal();
      } else {
        showNotification(data.error || "Failed to send emails", "error");
      }
    } catch (err) {
      console.error("Send error:", err);
      showNotification("Error sending emails", "error");
    } finally {
      setSendingEmail(null);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    if (!term) return true;
    return (
      (u.name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      (u.cid || "").toLowerCase().includes(term) ||
      (u.departmentName || "").toLowerCase().includes(term) ||
      (u.divisionName || "").toLowerCase().includes(term)
    );
  });

  // ─── Viewer Modal ─────────────────────────────────
  const openViewer = (doc) => {
    setViewerFileUrl(doc.file_url);
    setViewerFileName(doc.file_url.split("/").pop() || "document.pdf");
    setShowViewerModal(true);
  };

  const closeViewer = () => {
    setShowViewerModal(false);
    setViewerFileUrl("");
    setViewerFileName("");
  };

  // ─── Add Form ────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        showNotification("File size must be less than 50MB", "error");
        e.target.value = "";
        return;
      }
      setFormData((prev) => ({ ...prev, file }));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.document_type) {
      showNotification("Please select a document type", "error");
      return;
    }
    if (!formData.commission) {
      showNotification("Please select a commission", "error");
      return;
    }
    if (!formData.subject.trim()) {
      showNotification("Subject is required", "error");
      return;
    }
    if (!formData.file) {
      showNotification("Please select a file to upload", "error");
      return;
    }

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
      const res = await fetch("/api/meetings/documents", {
        method: "POST",
        body: data,
      });

      let errorMsg = "Upload failed";
      let responseData = {};
      try {
        responseData = await res.json();
        if (responseData.error) errorMsg = responseData.error;
      } catch (parseErr) {
        if (!res.ok) errorMsg = `Server error (${res.status})`;
      }

      if (!res.ok) throw new Error(errorMsg);

      showNotification("Document uploaded successfully!", "success");
      setFormData((prev) => ({
        ...prev,
        display_order: "",
        subject: "",
        file: null,
      }));
      document.getElementById("fileInput").value = "";
      await fetchDocuments();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit Form ───────────────────────────────────
  const openEditForm = (doc) => {
    if (viewedItemId) setViewedItemId(null);
    closeEditForm();

    setEditMode(true);
    setEditingId(doc.id);
    setHighlightedRowId(doc.id);
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
  };

  const closeEditForm = () => {
    setEditMode(false);
    setEditingId(null);
    setHighlightedRowId(null);
    setEditFormError("");
    setEditFormLoading(false);
    setEditExistingFile(null);
    setEditRemoveExisting(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setEditFormError("File size must be less than 50MB");
        e.target.value = "";
        return;
      }
      setEditFormData((prev) => ({ ...prev, file }));
      setEditFormError("");
    }
  };

  const removeEditSelectedFile = () => {
    setEditFormData((prev) => ({ ...prev, file: null }));
    const input = document.getElementById("editFileInput");
    if (input) input.value = "";
  };

  const removeEditExistingFile = () => {
    setEditRemoveExisting(true);
    setEditExistingFile(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditFormError("");
    setEditFormLoading(true);

    if (!editFormData.document_type) {
      setEditFormError("Please select a document type");
      setEditFormLoading(false);
      return;
    }
    if (!editFormData.commission) {
      setEditFormError("Please select a commission");
      setEditFormLoading(false);
      return;
    }
    if (!editFormData.subject.trim()) {
      setEditFormError("Subject is required");
      setEditFormLoading(false);
      return;
    }
    if (!editFormData.date) {
      setEditFormError("Date is required");
      setEditFormLoading(false);
      return;
    }

    if (editRemoveExisting && !editFormData.file) {
      setEditFormError("You removed the file. Please upload a new one.");
      setEditFormLoading(false);
      return;
    }

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
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(editFormData.file);
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
      let responseData = {};
      try {
        responseData = await res.json();
        if (responseData.error) errorMsg = responseData.error;
      } catch (parseErr) {
        if (!res.ok) errorMsg = `Server error (${res.status})`;
      }

      if (!res.ok) {
        if (res.status === 404) {
          errorMsg = "Document no longer exists.";
          closeEditForm();
          await fetchDocuments();
        }
        throw new Error(errorMsg);
      }

      await fetchDocuments();
      closeEditForm();
      showNotification("Document updated successfully!", "success");
    } catch (err) {
      console.error(err);
      setEditFormError(err.message || "Update failed");
    } finally {
      setEditFormLoading(false);
    }
  };

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
      showNotification("Document deleted successfully!", "success");
      if (editingId === id) closeEditForm();
      if (viewedItemId === id) setViewedItemId(null);
    } catch (error) {
      showNotification(error.message || "Delete failed", "error");
    }
  };

  // ─── Filtering & Sorting ─────────────────────────
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

  // Default: display_order descending
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

  // ─── Render ──────────────────────────────────────
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Minutes</h1>
          {canManage && (
            <button
              onClick={() => {
                if (showAddForm) setShowAddForm(false);
                else {
                  if (editingId) closeEditForm();
                  setShowAddForm(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} />
              {showAddForm ? "Cancel" : "Add Document"}
            </button>
          )}
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            ✅ {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            ❌ {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-96">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search your documents..."
                className="w-full px-4 py-2 pr-10 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition ${
                showFilters ? "bg-blue-50 border-blue-400 text-blue-600" : "hover:border-gray-400"
              }`}
            >
              <Filter size={16} /> Filters
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Show</span>
            <select value={rowsPerPage} onChange={handleRowsChange} className="border rounded px-2 py-1">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Document Filters</h3>
              <button onClick={clearFilters} className="text-xs text-blue-600 flex items-center gap-1">
                <XCircle size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Document Type</label>
                <select name="documentType" value={filters.documentType} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">All Types</option>
                  {dropdowns.documentTypes.map((type) => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Commission</label>
                <select name="commission" value={filters.commission} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">All Commissions</option>
                  {dropdowns.commissions.map((comm) => (
                    <option key={comm.id} value={comm.name}>{comm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Year</label>
                <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Upload New Minutes</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" name="display_order" value={formData.display_order} onChange={handleChange} placeholder="e.g., 1, 2, 3..." className="w-full border rounded px-3 py-2" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                  <select name="document_type" value={formData.document_type} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                    {dropdowns.documentTypes.map((type) => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission *</label>
                  <select name="commission" value={formData.commission} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                    {dropdowns.commissions.map((comm) => (
                      <option key={comm.id} value={comm.name}>{comm.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select name="year" value={formData.year} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Brief description" className="w-full border rounded px-3 py-2" required />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (PDF, DOC, DOCX) * — Max 50MB</label>
                <input id="fileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="w-full border rounded px-3 py-2" required />
                {formData.file && (
                  <p className="text-sm text-gray-500 mt-1">Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Uploading..." : "Upload Minutes"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* S/N column commented out */}
                {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase">S/N</th> */}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("display_order")}>Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("date")}>Date of Meeting</th>
                {/* Document Type column commented out */}
                {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort("document_type")}>Document Type</th> */}
                {/* ✅ Commission / Year column restored */}
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
                  const isEditing = highlightedRowId === doc.id && editMode;

                  return (
                    <React.Fragment key={doc.id}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded || isEditing ? "bg-blue-50 border-l-4 border-blue-400" : ""}`}>
                        {/* S/N cell commented out */}
                        {/* <td className="px-4 py-3 text-sm">{startIndex + index + 1}</td> */}
                        <td className="px-4 py-3 text-sm">{doc.display_order || "—"}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(doc.date)}</td>
                        {/* Document Type cell commented out */}
                        {/* <td className="px-4 py-3 text-sm">{doc.document_type}</td> */}
                        {/* ✅ Commission / Year cell restored */}
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium">{doc.commission}</span>
                          <span className="text-gray-400"> / </span>
                          <span>{doc.year}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{doc.subject}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openViewer(doc)} className="text-blue-600 hover:text-blue-800 transition" title="View document"><ViewIcon size={18} /></button>
                            <button onClick={() => handleDownload(doc)} className="text-blue-600 hover:text-blue-800 transition" title="Download file"><Download size={18} /></button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2 flex-wrap">
                          <button onClick={() => handleView(doc)} className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-blue-500 hover:text-blue-500 transition">
                            {isExpanded ? <><ChevronUp size={14} /> Close</> : <><Eye size={14} /> Details</>}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-gray-50/80">
                            <div className="mx-4 my-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-50 to-blue-100/30 px-6 py-4 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-800">Document Details</h4>
                                    <p className="text-sm text-gray-500">
                                      <span className="font-medium">Document Type:</span> {doc.document_type}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => openViewer(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition"><ViewIcon size={14} /> View</button>
                                    <button onClick={() => handleDownload(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition"><Download size={14} /> Download</button>
                                    {canManage && (
                                      <>
                                        <button onClick={() => openEditForm(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-md text-xs font-medium hover:bg-yellow-100 transition"><Pencil size={14} /> Edit</button>
                                        <button onClick={() => handleDelete(doc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-medium hover:bg-red-100 transition"><Trash2 size={14} /> Delete</button>

                                        {/* Hidden for now — Test / Send All / Send to... buttons
                                        <button onClick={() => openTestEmailModal(doc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-md text-xs font-medium hover:bg-green-100 transition"><Mail size={14} /> Test</button>
                                        <button onClick={() => handleSendEmail(doc.id)} disabled={sendingEmail === doc.id} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white border border-green-600 rounded-md text-xs font-medium hover:bg-green-700 transition disabled:opacity-50">
                                          {sendingEmail === doc.id ? (<span className="inline-block animate-spin">⟳</span>) : (<Mail size={14} />)}
                                          {sendingEmail === doc.id ? "Sending..." : "Send All"}
                                        </button>
                                        <button onClick={() => openSendToModal(doc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md text-xs font-medium hover:bg-indigo-100 transition"><Users size={14} /> Send to...</button>
                                        */}

                                        <button onClick={() => setSendDocId(doc.id)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-600 rounded-md text-xs font-medium hover:bg-indigo-700 transition"><Users size={14} /> Send Notification (new)</button>
                                      </>
                                    )}
                                    <button onClick={() => handleView(doc)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-xs font-medium hover:bg-gray-100 transition"><X size={14} /> Close</button>
                                  </div>
                                </div>
                              </div>

                              <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                  <div className="flex items-start gap-3">
                                    <Hash size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Display Order</p>
                                      <p className="text-sm text-gray-800">{doc.display_order || "—"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Calendar size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Date</p>
                                      <p className="text-sm text-gray-800">{formatDate(doc.date)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <FileText size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Document Type</p>
                                      <p className="text-sm text-gray-800">{doc.document_type}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Users size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Commission</p>
                                      <p className="text-sm text-gray-800">{doc.commission}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Calendar size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Year</p>
                                      <p className="text-sm text-gray-800">{doc.year}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3 md:col-span-2">
                                    <FileText size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">Subject</p>
                                      <p className="text-sm text-gray-800">{doc.subject}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3 md:col-span-2">
                                    <File size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-500">File</p>
                                      <button onClick={() => openViewer(doc)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
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

                      {isEditing && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-white border-t border-gray-200">
                            <div className="mx-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/30 px-6 py-4 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                  <h2 className="text-lg font-bold text-gray-800">Edit Document</h2>
                                  <button onClick={closeEditForm} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                                </div>
                              </div>

                              <div className="p-6">
                                {editFormError && (
                                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">❌ {editFormError}</div>
                                )}

                                <form onSubmit={handleEditSubmit}>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                      <input type="number" name="display_order" value={editFormData.display_order} onChange={handleEditChange} className="w-full border rounded px-3 py-2" min="1" placeholder="e.g., 1, 2, 3..." />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                                      <select name="document_type" value={editFormData.document_type} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                        {dropdowns.documentTypes.map((type) => (
                                          <option key={type.id} value={type.name}>{type.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Commission *</label>
                                      <select name="commission" value={editFormData.commission} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                        {dropdowns.commissions.map((comm) => (
                                          <option key={comm.id} value={comm.name}>{comm.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                                      <select name="year" value={editFormData.year} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required>
                                        {YEAR_OPTIONS.map((year) => (
                                          <option key={year} value={year}>{year}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                      <input type="date" name="date" value={editFormData.date} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                    <input type="text" name="subject" value={editFormData.subject} onChange={handleEditChange} className="w-full border rounded px-3 py-2" required />
                                  </div>

                                  <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Replace File (optional) — Max 50MB</label>
                                    <div className="flex flex-col space-y-2">
                                      <input id="editFileInput" type="file" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border rounded px-3 py-2" />
                                      <div className="flex flex-wrap gap-2 mt-1">
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
                                  </div>

                                  <div className="mt-6 flex gap-3">
                                    <button type="button" onClick={closeEditForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                                    <button type="submit" disabled={editFormLoading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                                      {editFormLoading ? (<><span className="inline-block animate-spin mr-2">⟳</span> Updating...</>) : "Update"}
                                    </button>
                                  </div>
                                </form>
                              </div>
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

        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-4 mt-5 text-sm">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&lt;</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}>&gt;</button>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 Click <strong>"Details"</strong> to view, edit, or delete your documents. Use <strong>"Send Notification"</strong> for selective sending.
          </p>
        </div>

        {/* Test Email Modal */}
        {showTestEmailModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">🧪 Send Test Email</h3>
                <button onClick={() => { setShowTestEmailModal(false); setTestEmailInput(""); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Enter an email address to send a test notification.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={testEmailInput} onChange={(e) => setTestEmailInput(e.target.value)} placeholder="test@example.com" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowTestEmailModal(false); setTestEmailInput(""); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                <button onClick={handleTestEmailSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">Send Test Email</button>
              </div>
            </div>
          </div>
        )}

        {/* Send-to Modal */}
        {showSendToModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">📧 Send Notifications</h3>
                <button onClick={closeSendToModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setSendToTab("all")} className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${sendToTab === "all" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>All Users</button>
                <button onClick={() => setSendToTab("departments")} className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${sendToTab === "departments" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>By Department</button>
                <button onClick={() => setSendToTab("divisions")} className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${sendToTab === "divisions" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>By Division</button>
                <button onClick={() => setSendToTab("individuals")} className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${sendToTab === "individuals" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>Individuals</button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {sendToTab === "all" && (
                  <div className="text-center py-8">
                    <Users size={48} className="text-indigo-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-800">Send to All Users</p>
                    <p className="text-sm text-gray-500 mt-2">This will send the notification to every active user in the system.</p>
                  </div>
                )}

                {sendToTab === "departments" && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Select Departments ({selectedDepartments.length} selected)</label>
                      <button onClick={selectAllDepartments} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        {selectedDepartments.length === dropdowns.departments.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                      {dropdowns.departments.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No departments found</div>
                      ) : (
                        dropdowns.departments.map((dept) => (
                          <label key={dept.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <input type="checkbox" checked={selectedDepartments.includes(dept.id)} onChange={() => toggleDepartment(dept.id)} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm text-gray-800">{dept.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {sendToTab === "divisions" && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-700">Select Divisions ({selectedDivisions.length} selected)</label>
                      <button onClick={selectAllDivisions} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        {selectedDivisions.length === dropdowns.divisions.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                      {dropdowns.divisions.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No divisions found</div>
                      ) : (
                        dropdowns.divisions.map((div) => (
                          <label key={div.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <input type="checkbox" checked={selectedDivisions.includes(div.id)} onChange={() => toggleDivision(div.id)} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-sm text-gray-800">{div.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {sendToTab === "individuals" && (
                  <div>
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Select Individuals ({selectedUsers.length} selected)</label>
                        {filteredUsers.length > 0 && (
                          <button onClick={selectAllFilteredUsers} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            {filteredUsers.every((u) => selectedUsers.includes(u._id)) ? "Deselect All" : "Select All"}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name, email, CID, department, division..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                      {loadingUsers ? (
                        <div className="p-4 text-sm text-gray-500 text-center">Loading users...</div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No users found</div>
                      ) : (
                        filteredUsers.map((user) => (
                          <label key={user._id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user._id)}
                              onChange={() => toggleUser(user._id)}
                              className="w-4 h-4 text-indigo-600 rounded mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{user.name || "Unnamed"}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              {(user.departmentName || user.divisionName) && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">
                                  {user.departmentName || "—"}
                                  {user.divisionName ? ` · ${user.divisionName}` : ""}
                                </p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
                <div className="text-sm text-gray-600">
                  {sendToTab === "all" && "Will send to all active users"}
                  {sendToTab === "departments" && (selectedDepartments.length > 0 ? `${selectedDepartments.length} department(s) selected` : "No departments selected")}
                  {sendToTab === "divisions" && (selectedDivisions.length > 0 ? `${selectedDivisions.length} division(s) selected` : "No divisions selected")}
                  {sendToTab === "individuals" && (selectedUsers.length > 0 ? `${selectedUsers.length} individual(s) selected` : "No individuals selected")}
                </div>
                <div className="flex gap-3">
                  <button onClick={closeSendToModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
                  <button onClick={handleSendToSubmit} disabled={sendingEmail === sendToDocId} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50">
                    {sendingEmail === sendToDocId ? "Sending..." : "Send Emails"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Send Notification Modal */}
        {sendDocId && (
          <SendNotificationModal
            docId={sendDocId}
            onClose={() => setSendDocId(null)}
            onSent={(result) => {
              setSendDocId(null);
            }}
          />
        )}

        {/* PDF Viewer Modal */}
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