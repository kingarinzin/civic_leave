"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, Save, Check, X, Plus, Eye, Edit } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export default function TrainingLogPage() {
  const [items, setItems] = useState([]);
  const [programTitles, setProgramTitles] = useState([]);
  const [fundingAgencies, setFundingAgencies] = useState([]);
  const [fundingModalities, setFundingModalities] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [notification, setNotification] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [activeTab, setActiveTab] = useState("program");
  const [isViewMode, setIsViewMode] = useState(false);

  const [formData, setFormData] = useState({
    programTitle: "",
    startDate: "",
    endDate: "",
    fundingAgency: "",
    fundingModality: "",
    institution: "",
    place: "",
    country: "Bhutan",
    numberOfParticipants: "",
    totalCost: "",
    hrcReference: "",
    status: "Scheduled",
    certification: false,
  });

  // ─── FETCH DROPDOWN DATA ──────────────────────────
  const fetchDropdownData = async () => {
    try {
      const [titlesRes, agenciesRes, modalitiesRes, instRes] = await Promise.all([
        fetch("/api/hr/program-title"),
        fetch("/api/hr/funding-agency"),
        fetch("/api/hr/funding-modality"),
        fetch("/api/hr/institution"),
      ]);
      const titles = await titlesRes.json();
      const agencies = await agenciesRes.json();
      const modalities = await modalitiesRes.json();
      const insts = await instRes.json();
      setProgramTitles(Array.isArray(titles) ? titles : []);
      setFundingAgencies(Array.isArray(agencies) ? agencies : []);
      setFundingModalities(Array.isArray(modalities) ? modalities : []);
      setInstitutions(Array.isArray(insts) ? insts : []);
    } catch (err) {
      console.error("Failed to fetch dropdown data:", err);
      showNotification("Failed to load reference data", "error");
    }
  };

  // ─── FETCH TRAINING LOGS ───────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/training-log");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showNotification("Failed to load Training Logs", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchDropdownData();
  }, []);

  // ─── HANDLERS ──────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProgramSelect = async (e) => {
    const programId = e.target.value;
    setFormData((prev) => ({ ...prev, programTitle: programId }));

    if (!programId) {
      setSelectedProgram(null);
      return;
    }

    const found = programTitles.find((p) => p._id === programId);
    if (found) {
      setSelectedProgram(found);
      return;
    }

    try {
      const res = await fetch(`/api/hr/program-title/${programId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProgram(data);
      } else {
        setSelectedProgram(null);
      }
    } catch (error) {
      console.error("Error fetching program:", error);
      setSelectedProgram(null);
    }
  };

  const resetForm = () => {
    setFormData({
      programTitle: "",
      startDate: "",
      endDate: "",
      fundingAgency: "",
      fundingModality: "",
      institution: "",
      place: "",
      country: "Bhutan",
      numberOfParticipants: "",
      totalCost: "",
      hrcReference: "",
      status: "Scheduled",
      certification: false,
    });
    setSelectedProgram(null);
    setEditData(null);
    setShowForm(false);
    setActiveTab("program");
    setIsViewMode(false);
  };

  const handleView = async (item) => {
    setEditData(item);
    setFormData({
      programTitle: item.programTitle?._id || item.programTitle || "",
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      fundingAgency: item.fundingAgency?._id || "",
      fundingModality: item.fundingModality?._id || "",
      institution: item.institution?._id || "",
      place: item.place || "",
      country: item.country || "Bhutan",
      numberOfParticipants: item.numberOfParticipants || "",
      totalCost: item.totalCost || "",
      hrcReference: item.hrcReference || "",
      status: item.status || "Scheduled",
      certification: item.certification || false,
    });

    let programData = item.programTitle;
    if (typeof programData === "string" || (programData && programData._id && !programData.title)) {
      const id = typeof programData === "string" ? programData : programData._id;
      const found = programTitles.find((p) => p._id === id);
      if (found) {
        programData = found;
      } else {
        try {
          const res = await fetch(`/api/hr/program-title/${id}`);
          if (res.ok) programData = await res.json();
          else programData = null;
        } catch {
          programData = null;
        }
      }
    }
    setSelectedProgram(programData || null);
    setIsViewMode(true);
    setActiveTab("program");
    setShowForm(true);
  };

  const handleSwitchToEdit = () => {
    setIsViewMode(false);
  };

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/hr/training-log", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      await fetchItems();
      resetForm();
      showNotification("Training Log added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch("/api/hr/training-log", {
        method: "PUT",
        body: JSON.stringify({ _id: editData._id, ...formData }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      await fetchItems();

      setEditData(data);
      setFormData({
        programTitle: data.programTitle?._id || data.programTitle || "",
        startDate: data.startDate ? new Date(data.startDate).toISOString().split("T")[0] : "",
        endDate: data.endDate ? new Date(data.endDate).toISOString().split("T")[0] : "",
        fundingAgency: data.fundingAgency?._id || "",
        fundingModality: data.fundingModality?._id || "",
        institution: data.institution?._id || "",
        place: data.place || "",
        country: data.country || "Bhutan",
        numberOfParticipants: data.numberOfParticipants || "",
        totalCost: data.totalCost || "",
        hrcReference: data.hrcReference || "",
        status: data.status || "Scheduled",
        certification: data.certification || false,
      });
      setSelectedProgram(data.programTitle || null);
      setIsViewMode(true);
      showNotification("Training Log updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete this log?`)) return;
    try {
      const res = await fetch("/api/hr/training-log", {
        method: "DELETE",
        body: JSON.stringify({ _id: item._id }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await fetchItems();
      showNotification("Training Log deleted successfully", "success");
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

  const filtered = items.filter((item) => {
    const searchLower = search.toLowerCase();
    const title = item.programTitle?.title || "";
    const trainingId = item.programTitle?.trainingId || "";
    const status = item.status || "";
    return (
      title.toLowerCase().includes(searchLower) ||
      trainingId.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower)
    );
  });

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === "programTitle") {
        aVal = a.programTitle?.title || "";
        bVal = b.programTitle?.title || "";
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

  // ─── Helper: resolve dropdown labels for view mode ──
  const getFundingAgencyName = (id) => {
    const found = fundingAgencies.find((a) => a._id === id);
    return found ? found.name : id;
  };
  const getFundingModalityName = (id) => {
    const found = fundingModalities.find((a) => a._id === id);
    return found ? found.name : id;
  };
  const getInstitutionName = (id) => {
    const found = institutions.find((a) => a._id === id);
    return found ? found.name : id;
  };

  // ─── RENDER ────────────────────────────────────────
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Training Log</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditData(null);
                setFormData({
                  programTitle: "",
                  startDate: "",
                  endDate: "",
                  fundingAgency: "",
                  fundingModality: "",
                  institution: "",
                  place: "",
                  country: "Bhutan",
                  numberOfParticipants: "",
                  totalCost: "",
                  hrcReference: "",
                  status: "Scheduled",
                  certification: false,
                });
                setSelectedProgram(null);
                setActiveTab("program");
                setIsViewMode(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-black transition"
            >
              <Plus size={14} /> Add Training Log
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

        {/* ─── FORM (Add/Edit/View) ───────────────────── */}
        {showForm && (
          <div className="bg-white shadow rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editData ? (isViewMode ? "View Training Log" : "Edit Training Log") : "Add Training Log"}
              </h2>
              <button
                onClick={() => resetForm()}
                className="text-xl text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* ─── If editData exists → show tabs ───────── */}
            {editData ? (
              <>
                {/* Tab Navigation – Blue indicator */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab("program")}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      activeTab === "program"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Program Title
                  </button>
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      activeTab === "details"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Training Details
                  </button>
                </div>

                {/* ─── TAB CONTENT (edit/view) ────────── */}
                {activeTab === "program" && (
                  <div className="bg-white">
                    <h3 className="text-md font-semibold mb-4">PROGRAM DETAILS</h3>
                    {isViewMode ? (
                      selectedProgram ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                          <div className="flex">
                            <span className="text-sm font-medium text-gray-600 w-36">Training ID</span>
                            <span className="text-sm">{selectedProgram.trainingId}</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm font-medium text-gray-600 w-36">Title</span>
                            <span className="text-sm">{selectedProgram.title}</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm font-medium text-gray-600 w-36">Location Category</span>
                            <span className="text-sm">{selectedProgram.locationCategory}</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm font-medium text-gray-600 w-36">Training Group</span>
                            <span className="text-sm">{selectedProgram.trainingGroup}</span>
                          </div>
                          <div className="flex md:col-span-2">
                            <span className="text-sm font-medium text-gray-600 w-36 flex-shrink-0">Description</span>
                            <span className="text-sm break-words min-w-0">{selectedProgram.description || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">No program selected</p>
                      )
                    ) : (
                      // ─── EDIT MODE: Program Selection and Preview ───
                      <>
                        <div className="mb-4">
                          <label className="text-sm font-medium">Program Title *</label>
                          <select
                            name="programTitle"
                            value={formData.programTitle}
                            onChange={handleProgramSelect}
                            className="w-full border rounded px-3 py-2 mt-1"
                            required
                          >
                            <option value="">Select Program</option>
                            {programTitles.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.trainingId} - {p.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedProgram && (
                          <div className="bg-gray-50 p-3 rounded border">
                            <h4 className="font-semibold text-sm mb-2">Program Details:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <p><span className="font-medium">Title:</span> {selectedProgram.title}</p>
                              <p><span className="font-medium">Training ID:</span> {selectedProgram.trainingId}</p>
                              <p><span className="font-medium">Location Category:</span> {selectedProgram.locationCategory}</p>
                              <p><span className="font-medium">Training Group:</span> {selectedProgram.trainingGroup}</p>
                              <p className="col-span-2"><span className="font-medium">Description:</span> {selectedProgram.description || "—"}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="bg-white">
                    <h3 className="text-md font-semibold mb-4">TRAINING DETAILS</h3>
                    {isViewMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Start Date</span>
                          <span className="text-sm">{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">End Date</span>
                          <span className="text-sm">{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Funding Agency</span>
                          <span className="text-sm">{getFundingAgencyName(formData.fundingAgency) || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Funding Modality</span>
                          <span className="text-sm">{getFundingModalityName(formData.fundingModality) || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Institution</span>
                          <span className="text-sm">{getInstitutionName(formData.institution) || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Place/City</span>
                          <span className="text-sm">{formData.place || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Country</span>
                          <span className="text-sm">{formData.country || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">No. of Participants</span>
                          <span className="text-sm">{formData.numberOfParticipants || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Total Cost (Nu.)</span>
                          <span className="text-sm">{formData.totalCost ? Number(formData.totalCost).toLocaleString() : "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">HRC Reference</span>
                          <span className="text-sm">{formData.hrcReference || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Status</span>
                          <span className="text-sm">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                formData.status === "Scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : formData.status === "In progress"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : formData.status === "Completed"
                                  ? "bg-green-100 text-green-700"
                                  : formData.status === "Cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {formData.status}
                            </span>
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Certification</span>
                          <span className="text-sm">{formData.certification ? "✅ Yes" : "❌ No"}</span>
                        </div>
                      </div>
                    ) : (
                      // ─── EDIT MODE: all fields as inputs ───
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Start Date *</label>
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">End Date *</label>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Funding Agency *</label>
                          <select
                            name="fundingAgency"
                            value={formData.fundingAgency}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            <option value="">Select Funding Agency</option>
                            {fundingAgencies.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Funding Modality *</label>
                          <select
                            name="fundingModality"
                            value={formData.fundingModality}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            <option value="">Select Funding Modality</option>
                            {fundingModalities.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Institution *</label>
                          <select
                            name="institution"
                            value={formData.institution}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            <option value="">Select Institution</option>
                            {institutions.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Place/City *</label>
                          <input
                            type="text"
                            name="place"
                            value={formData.place}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                            placeholder="e.g., Thimphu"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Country *</label>
                          <select
                            name="country"
                            value={formData.country}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">No. of Participants *</label>
                          <input
                            type="number"
                            name="numberOfParticipants"
                            value={formData.numberOfParticipants}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Total Cost (Nu.) *</label>
                          <input
                            type="number"
                            name="totalCost"
                            value={formData.totalCost}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">HRC Reference</label>
                          <input
                            type="text"
                            name="hrcReference"
                            value={formData.hrcReference}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            placeholder="e.g., HRC-2025-001"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Status *</label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleFormChange}
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="In progress">In progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Deferred">Deferred</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            name="certification"
                            checked={formData.certification}
                            onChange={handleFormChange}
                            className="w-4 h-4"
                          />
                          <label className="text-sm font-medium">Certification</label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // ─── ADD MODE: Unified form (no tabs) ────
              <div>
                {/* Program Title Dropdown (always visible) */}
                <div className="mb-4">
                  <label className="text-sm font-medium">Program Title *</label>
                  <select
                    name="programTitle"
                    value={formData.programTitle}
                    onChange={handleProgramSelect}
                    className="w-full border rounded px-3 py-2 mt-1"
                    required
                  >
                    <option value="">Select Program</option>
                    {programTitles.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.trainingId} - {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Preview */}
                {selectedProgram && (
                  <div className="bg-gray-50 p-3 rounded border mb-4">
                    <h4 className="font-semibold text-sm mb-2">Program Details:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium">Title:</span> {selectedProgram.title}</p>
                      <p><span className="font-medium">Training ID:</span> {selectedProgram.trainingId}</p>
                      <p><span className="font-medium">Location Category:</span> {selectedProgram.locationCategory}</p>
                      <p><span className="font-medium">Training Group:</span> {selectedProgram.trainingGroup}</p>
                      <p className="col-span-2"><span className="font-medium">Description:</span> {selectedProgram.description || "—"}</p>
                    </div>
                  </div>
                )}

                {/* All other fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Funding Agency *</label>
                    <select
                      name="fundingAgency"
                      value={formData.fundingAgency}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select Funding Agency</option>
                      {fundingAgencies.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Funding Modality *</label>
                    <select
                      name="fundingModality"
                      value={formData.fundingModality}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select Funding Modality</option>
                      {fundingModalities.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Institution *</label>
                    <select
                      name="institution"
                      value={formData.institution}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select Institution</option>
                      {institutions.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Place/City *</label>
                    <input
                      type="text"
                      name="place"
                      value={formData.place}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                      placeholder="e.g., Thimphu"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country *</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">No. of Participants *</label>
                    <input
                      type="number"
                      name="numberOfParticipants"
                      value={formData.numberOfParticipants}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Cost (Nu.) *</label>
                    <input
                      type="number"
                      name="totalCost"
                      value={formData.totalCost}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">HRC Reference</label>
                    <input
                      type="text"
                      name="hrcReference"
                      value={formData.hrcReference}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., HRC-2025-001"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In progress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Deferred">Deferred</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      name="certification"
                      checked={formData.certification}
                      onChange={handleFormChange}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium">Certification</label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── FOOTER BUTTONS ────────────────────────── */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => resetForm()}
                className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
              >
                <X size={14} /> Cancel
              </button>
              {isViewMode && editData ? (
                <button
                  onClick={handleSwitchToEdit}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition"
                >
                  <Edit size={14} /> Edit
                </button>
              ) : editData ? (
                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition"
                >
                  <Check size={14} /> Update
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition"
                >
                  <Save size={14} /> Save
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── TOOLBAR & TABLE ────────────────────────── */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by title, training ID, or status..."
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
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th
                  onClick={() => handleSort("programTitle")}
                  className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none"
                >
                  TRAINING ID / TITLE
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">START DATE</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">END DATE</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">STATUS</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">CERTIFICATION</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : paginated.length > 0 ? (
                paginated.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-100 transition-colors">
                    <td className="px-6 py-3 text-sm">{startIndex + index + 1}</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium">{item.programTitle?.trainingId || "—"}</div>
                      <div className="text-xs text-gray-500">{item.programTitle?.title || ""}</div>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === "Scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : item.status === "In progress"
                            ? "bg-yellow-100 text-yellow-700"
                            : item.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">{item.certification ? "✅ Yes" : "❌ No"}</td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleView(item)}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition"
                      >
                        <Eye size={14} /> View
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
                <tr><td colSpan="7" className="text-center py-6 text-gray-500">No records found</td></tr>
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
              className={`font-semibold text-lg ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
            >
              &lt;
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "hover:text-blue-600"}`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}