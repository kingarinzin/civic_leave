"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Trash2, Pencil, Save, Check, X, Plus, Eye, Edit, User, Users,
  Search, ChevronDown, ChevronRight, Calendar, Phone, Mail, Building,
  Award, Briefcase, GraduationCap, UserCheck, Hash, FileText, MapPin,
  ChevronUp, Loader2, Filter, XCircle
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

// ─── FULL COUNTRY LIST ──────────────────────────────────
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

// ─── Searchable Country Dropdown ──────────────────────
function SearchableCountrySelect({ value, onChange, placeholder = "Select Country" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (country) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || placeholder}
        </span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-3 max-h-80 overflow-y-auto">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {filteredCountries.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500 text-sm py-2">No countries found</div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={country}
                  className={`px-2 py-1 text-sm rounded cursor-pointer hover:bg-blue-50 ${
                    country === value ? "bg-blue-100 text-blue-700 font-medium" : ""
                  }`}
                  onClick={() => handleSelect(country)}
                >
                  {country}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ──────────────────────────────
function DetailItem({ icon: Icon, label, value, isLink }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-gray-500 block">{label}</span>
        {isLink ? (
          <a href={isLink} className="text-blue-600 hover:underline break-words">
            {value}
          </a>
        ) : (
          <p className="text-gray-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
        {Icon && <Icon size={16} className="text-blue-500" />}
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────
export default function TrainingLogPage() {
  const [items, setItems] = useState([]);
  const [programTitles, setProgramTitles] = useState([]);
  const [fundingAgencies, setFundingAgencies] = useState([]);
  const [fundingModalities, setFundingModalities] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
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
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [expandedEmployeeData, setExpandedEmployeeData] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // ─── Expanded employee row (By Employee) ──────────
  const [expandedEmpRow, setExpandedEmpRow] = useState(null);

  // ─── Saving state ─────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  // ─── Filter state ─────────────────────────────────
  const [showTrainingFilters, setShowTrainingFilters] = useState(false);
  const [trainingFilters, setTrainingFilters] = useState({
    trainingGroup: "",
    trainingType: "",
    locationCategory: "",
    status: "",
    country: "",
  });

  const [showEmployeeFilters, setShowEmployeeFilters] = useState(false);
  const [employeeFilters, setEmployeeFilters] = useState({
    department: "",
    division: "",
    positionLevel: "",
    trainingStatus: "",
  });

  const [viewTab, setViewTab] = useState("training");

  const [formData, setFormData] = useState({
    programTitle: "",
    startDate: "",
    endDate: "",
    fundingAgency: "",
    fundingModality: "",
    institution: "",
    country: "Bhutan",
    place: "",
    numberOfParticipants: "",
    totalCost: "",
    hrcReference: "",
    status: "Scheduled",
    certification: false,
    employees: [],
  });

  // ─── FETCH DROPDOWN DATA ──────────────────────────
  const fetchDropdownData = async () => {
    try {
      const [titlesRes, agenciesRes, modalitiesRes, instRes, empRes] = await Promise.all([
        fetch("/api/hr/program-title"),
        fetch("/api/hr/funding-agency"),
        fetch("/api/hr/funding-modality"),
        fetch("/api/hr/institution"),
        fetch("/api/hr/employees"),
      ]);
      const titles = await titlesRes.json();
      const agencies = await agenciesRes.json();
      const modalities = await modalitiesRes.json();
      const insts = await instRes.json();
      const emps = await empRes.json();
      setProgramTitles(Array.isArray(titles) ? titles : []);
      setFundingAgencies(Array.isArray(agencies) ? agencies : []);
      setFundingModalities(Array.isArray(modalities) ? modalities : []);
      setInstitutions(Array.isArray(insts) ? insts : []);
      setEmployeesList(Array.isArray(emps) ? emps : []);
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

  const toggleEmployee = (empId) => {
    setFormData((prev) => {
      const current = prev.employees || [];
      if (current.includes(empId)) {
        return { ...prev, employees: current.filter((id) => id !== empId) };
      } else {
        return { ...prev, employees: [...current, empId] };
      }
    });
  };

  const isEmployeeSelected = (empId) => {
    return (formData.employees || []).includes(empId);
  };

  const filteredEmployees = employeesList.filter((emp) => {
    const term = employeeSearchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(term) ||
      emp.cidNumber?.toLowerCase().includes(term) ||
      emp.positionTitle?.toLowerCase().includes(term)
    );
  });

  const fetchEmployeeDetails = async (empId) => {
    if (expandedEmployeeId === empId) {
      setExpandedEmployeeId(null);
      setExpandedEmployeeData(null);
      return;
    }
    setLoadingEmployee(true);
    try {
      const found = employeesList.find((e) => e._id === empId);
      if (found && found.gender !== undefined) {
        setExpandedEmployeeData(found);
        setExpandedEmployeeId(empId);
        setLoadingEmployee(false);
        return;
      }
      const cid = found?.cidNumber;
      if (cid) {
        const res = await fetch(`/api/hr/employee/${cid}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedEmployeeData(data);
          setExpandedEmployeeId(empId);
        } else {
          setExpandedEmployeeData(found || null);
          setExpandedEmployeeId(empId);
        }
      } else {
        setExpandedEmployeeData(found || null);
        setExpandedEmployeeId(empId);
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setExpandedEmployeeData(null);
    } finally {
      setLoadingEmployee(false);
    }
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
      country: "Bhutan",
      place: "",
      numberOfParticipants: "",
      totalCost: "",
      hrcReference: "",
      status: "Scheduled",
      certification: false,
      employees: [],
    });
    setSelectedProgram(null);
    setEditData(null);
    setShowForm(false);
    setActiveTab("program");
    setIsViewMode(false);
    setEmployeeSearchTerm("");
    setExpandedEmployeeId(null);
    setExpandedEmployeeData(null);
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
      country: item.country || "Bhutan",
      place: item.place || "",
      numberOfParticipants: item.numberOfParticipants || "",
      totalCost: item.totalCost || "",
      hrcReference: item.hrcReference || "",
      status: item.status || "Scheduled",
      certification: item.certification || false,
      employees: item.employees?.map((e) => e._id || e) || [],
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

  // ─── Client-side validation ──────────────────────────
  const validateForm = () => {
    const required = [
      { field: "programTitle", label: "Program Title" },
      { field: "startDate", label: "Start Date" },
      { field: "endDate", label: "End Date" },
      { field: "fundingAgency", label: "Funding Agency" },
      { field: "fundingModality", label: "Funding Modality" },
      { field: "institution", label: "Institution" },
      { field: "country", label: "Country" },
      { field: "place", label: "Place/City" },
      { field: "numberOfParticipants", label: "Number of Participants" },
      { field: "totalCost", label: "Total Cost" },
    ];
    for (const req of required) {
      const val = formData[req.field];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        showNotification(`Please fill in the ${req.label} field`, "error");
        return false;
      }
    }
    return true;
  };

  // ─── Add / Update with validation & loading ──────────
  const handleAdd = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = { ...formData, employees: formData.employees || [] };
      const res = await fetch("/api/hr/training-log", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      await fetchItems();
      resetForm();
      showNotification("Training Log added successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = { _id: editData._id, ...formData, employees: formData.employees || [] };
      const res = await fetch("/api/hr/training-log", {
        method: "PUT",
        body: JSON.stringify(payload),
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
        country: data.country || "Bhutan",
        place: data.place || "",
        numberOfParticipants: data.numberOfParticipants || "",
        totalCost: data.totalCost || "",
        hrcReference: data.hrcReference || "",
        status: data.status || "Scheduled",
        certification: data.certification || false,
        employees: data.employees?.map((e) => e._id || e) || [],
      });
      setSelectedProgram(data.programTitle || null);
      setIsViewMode(true);
      showNotification("Training Log updated successfully", "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setIsSaving(false);
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

  // ─── Aggregate employees from training logs ───────────
  const aggregatedEmployees = React.useMemo(() => {
    const map = new Map();
    items.forEach(log => {
      if (log.employees && log.employees.length) {
        log.employees.forEach(emp => {
          if (!map.has(emp._id)) {
            map.set(emp._id, {
              ...emp,
              trainings: []
            });
          }
          map.get(emp._id).trainings.push({
            trainingId: log.programTitle?.trainingId,
            title: log.programTitle?.title,
            startDate: log.startDate,
            endDate: log.endDate,
            status: log.status,
            locationCategory: log.programTitle?.locationCategory,
            trainingType: log.programTitle?.trainingType,
            country: log.country,
            place: log.place,
            logId: log._id
          });
        });
      }
    });

    // Compute totalAttended, lastDate, gap
    const result = Array.from(map.values()).map(emp => {
      const trainings = emp.trainings;
      const totalAttended = trainings.length;
      let lastDate = null;
      let gap = null;
      if (trainings.length > 0) {
        const sorted = [...trainings].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        lastDate = sorted[0].endDate;
        if (lastDate) {
          const now = new Date();
          const last = new Date(lastDate);
          let years = now.getFullYear() - last.getFullYear();
          let months = now.getMonth() - last.getMonth();
          if (months < 0) { years--; months += 12; }
          gap = `${years}y ${months}m`;
        }
      }
      return { ...emp, totalAttended, lastDate, gap };
    });
    return result;
  }, [items]);

  // ─── Compute unique filter options ──────────────────
  const trainingFilterOptions = React.useMemo(() => {
    const groups = new Set();
    const types = new Set();
    const locs = new Set();
    const statuses = new Set();
    const countries = new Set();

    items.forEach(log => {
      const prog = log.programTitle;
      if (prog) {
        if (prog.trainingGroup) groups.add(prog.trainingGroup);
        if (prog.locationCategory) locs.add(prog.locationCategory);
        const tt = prog.trainingType;
        if (tt) {
          if (typeof tt === 'string') types.add(tt);
          else if (tt.name) types.add(tt.name);
          else if (tt.trainingType) types.add(tt.trainingType);
        }
      }
      if (log.status) statuses.add(log.status);
      if (log.country) countries.add(log.country);
    });

    return {
      trainingGroups: Array.from(groups).sort(),
      trainingTypes: Array.from(types).sort(),
      locationCategories: Array.from(locs).sort(),
      statuses: Array.from(statuses).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [items]);

  const employeeFilterOptions = React.useMemo(() => {
    const depts = new Set();
    const divs = new Set();
    const levels = new Set();
    const statuses = new Set();

    aggregatedEmployees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
      if (emp.division) divs.add(emp.division);
      if (emp.positionLevel) levels.add(emp.positionLevel);
      emp.trainings?.forEach(t => {
        if (t.status) statuses.add(t.status);
      });
    });

    return {
      departments: Array.from(depts).sort(),
      divisions: Array.from(divs).sort(),
      positionLevels: Array.from(levels).sort(),
      trainingStatuses: Array.from(statuses).sort(),
    };
  }, [aggregatedEmployees]);

  // ─── Filtering for training log view ────────────────
  const filtered = items.filter((item) => {
    const searchLower = search.toLowerCase();
    const title = item.programTitle?.title || "";
    const trainingId = item.programTitle?.trainingId || "";
    const status = item.status || "";
    const country = item.country || "";
    const locationCategory = item.programTitle?.locationCategory || "";
    const group = item.programTitle?.trainingGroup || "";
    const type = item.programTitle?.trainingType?.name || item.programTitle?.trainingType || "";

    const searchMatch =
      title.toLowerCase().includes(searchLower) ||
      trainingId.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower) ||
      country.toLowerCase().includes(searchLower) ||
      locationCategory.toLowerCase().includes(searchLower) ||
      group.toLowerCase().includes(searchLower) ||
      type.toString().toLowerCase().includes(searchLower) ||
      (item.totalCost?.toString() || "").includes(searchLower);

    if (!searchMatch) return false;

    if (trainingFilters.trainingGroup && group !== trainingFilters.trainingGroup) return false;
    if (trainingFilters.trainingType && type !== trainingFilters.trainingType) return false;
    if (trainingFilters.locationCategory && locationCategory !== trainingFilters.locationCategory) return false;
    if (trainingFilters.status && status !== trainingFilters.status) return false;
    if (trainingFilters.country && country !== trainingFilters.country) return false;

    return true;
  });

  const sorted = [...filtered];
  if (sortConfig.key) {
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === "programTitle") {
        aVal = a.programTitle?.title || "";
        bVal = b.programTitle?.title || "";
      } else if (sortConfig.key === "dateRange") {
        aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
        bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
      } else if (sortConfig.key === "status") {
        aVal = a.status || "";
        bVal = b.status || "";
      } else if (sortConfig.key === "totalCost") {
        aVal = a.totalCost || 0;
        bVal = b.totalCost || 0;
      } else if (sortConfig.key === "locationCategory") {
        aVal = a.programTitle?.locationCategory || "";
        bVal = b.programTitle?.locationCategory || "";
      } else if (sortConfig.key === "country") {
        aVal = a.country || "";
        bVal = b.country || "";
      } else if (sortConfig.key === "trainingCategoryType") {
        const aGroup = a.programTitle?.trainingGroup || "";
        const aType = a.programTitle?.trainingType?.name || a.programTitle?.trainingType || "";
        aVal = (aGroup + aType).toLowerCase();
        const bGroup = b.programTitle?.trainingGroup || "";
        const bType = b.programTitle?.trainingType?.name || b.programTitle?.trainingType || "";
        bVal = (bGroup + bType).toLowerCase();
      } else if (sortConfig.key === "employees") {
        aVal = (a.employees || []).length;
        bVal = (b.employees || []).length;
      } else if (sortConfig.key === "certification") {
        aVal = a.certification ? 1 : 0;
        bVal = b.certification ? 1 : 0;
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

  // ─── Filtering for employee view ────────────────────
  const filteredEmployeesView = aggregatedEmployees.filter(emp => {
    const term = search.toLowerCase();
    const searchMatch =
      emp.fullName?.toLowerCase().includes(term) ||
      emp.cidNumber?.toLowerCase().includes(term) ||
      emp.positionTitle?.toLowerCase().includes(term) ||
      emp.trainings.some(t => t.trainingId?.toLowerCase().includes(term)) ||
      emp.trainings.some(t => t.title?.toLowerCase().includes(term));

    if (!searchMatch) return false;

    if (employeeFilters.department && emp.department !== employeeFilters.department) return false;
    if (employeeFilters.division && emp.division !== employeeFilters.division) return false;
    if (employeeFilters.positionLevel && emp.positionLevel !== employeeFilters.positionLevel) return false;
    if (employeeFilters.trainingStatus) {
      const hasStatus = emp.trainings.some(t => t.status === employeeFilters.trainingStatus);
      if (!hasStatus) return false;
    }

    return true;
  });

  const sortedEmployees = [...filteredEmployeesView];
  if (sortConfig.key) {
    sortedEmployees.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === "totalAttended") {
        aVal = a.totalAttended || 0;
        bVal = b.totalAttended || 0;
      } else if (sortConfig.key === "lastDate") {
        aVal = a.lastDate ? new Date(a.lastDate).getTime() : 0;
        bVal = b.lastDate ? new Date(b.lastDate).getTime() : 0;
      } else if (sortConfig.key === "gap") {
        aVal = a.gap || "";
        bVal = b.gap || "";
      } else if (sortConfig.key === "fullName") {
        aVal = a.fullName || "";
        bVal = b.fullName || "";
      } else if (sortConfig.key === "employeeNumber") {
        aVal = a.employeeNumber || "";
        bVal = b.employeeNumber || "";
      } else if (sortConfig.key === "positionTitle") {
        aVal = a.positionTitle || "";
        bVal = b.positionTitle || "";
      } else if (sortConfig.key === "email") {
        aVal = a.email || "";
        bVal = b.email || "";
      } else {
        aVal = a[sortConfig.key] || "";
        bVal = b[sortConfig.key] || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalEmpPages = Math.ceil(sortedEmployees.length / rowsPerPage);
  const startEmpIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEmployees = sortedEmployees.slice(startEmpIndex, startEmpIndex + rowsPerPage);

  // ─── Helpers ──────────────────────────────────────
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderTrainingType = (type) => {
    if (!type) return "—";
    if (typeof type === 'string') return type;
    if (typeof type === 'object' && type !== null) {
      if (type.name) return type.name;
      if (type.trainingType) return type.trainingType;
      return "—";
    }
    return String(type);
  };

  const formatPosition = (emp) => {
    if (!emp) return "—";
    let pos = emp.positionTitle || "";
    let level = emp.positionLevel || "";
    let sub = emp.subLevel || "";
    if (level) {
      pos += ` (${level}`;
      if (sub) pos += `-${sub}`;
      pos += ")";
    }
    return pos || "—";
  };

  const truncateWords = (text, numWords = 3) => {
    if (!text) return "—";
    const words = text.split(/\s+/);
    if (words.length <= numWords) return text;
    return words.slice(0, numWords).join(" ") + "...";
  };

  // ─── Group display – returns "STT" or "LTT" or original ──
  const groupDisplay = (group) => {
    if (!group) return "";
    if (group === "STT- Short Term Training" || group.includes("STT")) return "STT";
    if (group === "LTT- Long Term Training" || group.includes("LTT")) return "LTT";
    return group;
  };

  // ─── Expand toggle for employee row ────────────────
  const toggleEmpRow = (empId) => {
    setExpandedEmpRow(expandedEmpRow === empId ? null : empId);
  };

  // ─── Reset filters ──────────────────────────────────
  const clearTrainingFilters = () => {
    setTrainingFilters({
      trainingGroup: "",
      trainingType: "",
      locationCategory: "",
      status: "",
      country: "",
    });
  };

  const clearEmployeeFilters = () => {
    setEmployeeFilters({
      department: "",
      division: "",
      positionLevel: "",
      trainingStatus: "",
    });
  };

  // ─── RENDER ────────────────────────────────────────
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-64 bg-gray-100 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Training Log</h1>
          {!showForm && viewTab === "training" && (
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
                  country: "Bhutan",
                  place: "",
                  numberOfParticipants: "",
                  totalCost: "",
                  hrcReference: "",
                  status: "Scheduled",
                  certification: false,
                  employees: [],
                });
                setSelectedProgram(null);
                setActiveTab("program");
                setIsViewMode(false);
                setEmployeeSearchTerm("");
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

            {editData ? (
              // ─── EDIT / VIEW MODE – tabs ────────────
              <>
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
                  <button
                    onClick={() => setActiveTab("employees")}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      activeTab === "employees"
                        ? "border-b-2 border-blue-500 text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Users size={16} className="inline mr-1" /> Employees
                  </button>
                </div>

                {/* TAB: Program Title */}
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
                            <span className="text-sm">{groupDisplay(selectedProgram.trainingGroup)}</span>
                          </div>
                          <div className="flex">
                            <span className="text-sm font-medium text-gray-600 w-36">Training Type</span>
                            <span className="text-sm">{renderTrainingType(selectedProgram.trainingType)}</span>
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
                      // EDIT MODE – Program Selection
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
                              <p><span className="font-medium">Training Group:</span> {groupDisplay(selectedProgram.trainingGroup)}</p>
                              <p><span className="font-medium">Training Type:</span> {renderTrainingType(selectedProgram.trainingType)}</p>
                              <p className="col-span-2"><span className="font-medium">Description:</span> {selectedProgram.description || "—"}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* TAB: Training Details */}
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
                          <span className="text-sm font-medium text-gray-600 w-36">Country</span>
                          <span className="text-sm">{formData.country || "—"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm font-medium text-gray-600 w-36">Place/City</span>
                          <span className="text-sm">{formData.place || "—"}</span>
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
                      // EDIT MODE – inputs
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
                          <label className="text-sm font-medium">Country *</label>
                          <SearchableCountrySelect
                            value={formData.country}
                            onChange={(val) => setFormData({ ...formData, country: val })}
                            placeholder="Select Country"
                          />
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

                {/* ─── TAB: Employees ────────────────────── */}
                {activeTab === "employees" && (
                  <div className="bg-white">
                    <h3 className="text-md font-semibold mb-4">EMPLOYEES ATTENDED</h3>
                    {isViewMode ? (
                      editData?.employees && editData.employees.length > 0 ? (
                        <div className="space-y-3">
                          {editData.employees.map((emp) => {
                            const isExpanded = expandedEmployeeId === emp._id;
                            return (
                              <div key={emp._id} className="border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition">
                                  <div className="flex items-center gap-3">
                                    <User size={16} className="text-blue-600" />
                                    <span className="font-medium">{emp.fullName}</span>
                                    <span className="text-sm text-gray-500">({emp.cidNumber})</span>
                                    {emp.positionTitle && (
                                      <span className="text-xs text-gray-400">– {emp.positionTitle}</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => fetchEmployeeDetails(emp._id)}
                                    className="flex items-center gap-1 px-3 py-1 text-xs border rounded hover:bg-blue-50 hover:border-blue-300 transition"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronDown size={14} /> Hide Details
                                      </>
                                    ) : (
                                      <>
                                        <ChevronRight size={14} /> View Details
                                      </>
                                    )}
                                  </button>
                                </div>

                                {isExpanded && (
                                  <div className="p-4 bg-white border-t">
                                    {loadingEmployee ? (
                                      <div className="text-center py-4 text-gray-500">Loading employee details...</div>
                                    ) : expandedEmployeeData ? (
                                      <div className="space-y-6">
                                        <Section title="Personal Information" icon={User}>
                                          <DetailItem icon={User} label="Full Name" value={expandedEmployeeData.fullName} />
                                          <DetailItem icon={User} label="Gender" value={expandedEmployeeData.gender} />
                                          <DetailItem icon={Calendar} label="Date of Birth" value={expandedEmployeeData.dateOfBirth} />
                                          <DetailItem icon={Phone} label="Mobile" value={expandedEmployeeData.mobile} />
                                          <DetailItem icon={Mail} label="Email" value={expandedEmployeeData.email} isLink={`mailto:${expandedEmployeeData.email}`} />
                                        </Section>

                                        <Section title="Employment Details" icon={Briefcase}>
                                          <DetailItem icon={Briefcase} label="Employee Number" value={expandedEmployeeData.employeeNumber} />
                                          <DetailItem icon={Award} label="Position Level" value={`${expandedEmployeeData.positionLevel || ""}${expandedEmployeeData.subLevel ? `-${expandedEmployeeData.subLevel}` : ""}`} />
                                          <DetailItem icon={Calendar} label="Appointment Date" value={expandedEmployeeData.dateOfAppointment} />
                                          <DetailItem icon={Calendar} label="Last Promotion" value={expandedEmployeeData.lastDateOfPromotion} />
                                          <DetailItem icon={Users} label="Employee Type" value={expandedEmployeeData.empType} />
                                        </Section>

                                        <Section title="HR Custom Fields" icon={FileText}>
                                          <DetailItem icon={Building} label="Parent Agency" value={expandedEmployeeData.parentAgency || "Anti-Corruption Commission"} />
                                          <DetailItem icon={MapPin} label="MoG" value={expandedEmployeeData.mog} />
                                          <DetailItem icon={FileText} label="Sub Group" value={expandedEmployeeData.subGroup} />
                                          <DetailItem icon={FileText} label="Super Structure" value={expandedEmployeeData.superStructure} />
                                          <DetailItem icon={Briefcase} label="Position Type" value={expandedEmployeeData.positionType} />
                                          <DetailItem icon={GraduationCap} label="Degree" value={expandedEmployeeData.degree} />
                                          <DetailItem icon={GraduationCap} label="Area of Study" value={expandedEmployeeData.qualification} />
                                          <DetailItem icon={UserCheck} label="Current Status" value={expandedEmployeeData.currentStatus} />
                                          <DetailItem icon={Calendar} label="Date of Joining ACC" value={expandedEmployeeData.dateOfJoining} />
                                          <DetailItem icon={Hash} label="Intact Type" value={expandedEmployeeData.intactType} />
                                          <DetailItem icon={FileText} label="Remarks" value={expandedEmployeeData.remarks} />
                                        </Section>

                                        <Section title="Agency Path" icon={MapPin}>
                                          <DetailItem icon={MapPin} label="Full Agency Path" value={expandedEmployeeData.fullAgencyPath} />
                                          <DetailItem icon={Building} label="Department" value={expandedEmployeeData.department} />
                                          <DetailItem icon={Building} label="Division" value={expandedEmployeeData.division} />
                                        </Section>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-gray-500">No additional details available</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500">No employees selected</p>
                      )
                    ) : (
                      // EDIT MODE – employee multi-select
                      <div>
                        <div className="mb-3">
                          <label className="text-sm font-medium">Search Employees</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search by name or CID..."
                              value={employeeSearchTerm}
                              onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                              className="w-full border rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                            />
                          </div>
                        </div>
                        <div className="border rounded max-h-48 overflow-y-auto">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">No employees found</div>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <label
                                key={emp._id}
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={isEmployeeSelected(emp._id)}
                                  onChange={() => toggleEmployee(emp._id)}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium">{emp.fullName}</span>
                                  <span className="text-xs text-gray-500 ml-2">({emp.cidNumber})</span>
                                  {emp.positionTitle && (
                                    <span className="text-xs text-gray-400 ml-2">– {emp.positionTitle}</span>
                                  )}
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                        <div className="mt-3">
                          <span className="text-sm text-gray-500">
                            Selected: {(formData.employees || []).length} employee(s)
                          </span>
                          {(formData.employees || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {formData.employees.map((empId) => {
                                const emp = employeesList.find((e) => e._id === empId);
                                return emp ? (
                                  <span
                                    key={empId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                                  >
                                    {emp.fullName}
                                    <button
                                      onClick={() => toggleEmployee(empId)}
                                      className="hover:text-red-600 ml-1"
                                      type="button"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // ─── ADD MODE ──────────────────────────────
              <div>
                {/* ─── Program Details ─── */}
                <h3 className="text-md font-semibold text-blue-600 uppercase tracking-wider border-b border-blue-200 pb-2 mb-4">
                  Program Details
                </h3>

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
                  <div className="bg-gray-50 p-3 rounded border mb-4">
                    <h4 className="font-semibold text-sm mb-2">Program Details:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium">Title:</span> {selectedProgram.title}</p>
                      <p><span className="font-medium">Training ID:</span> {selectedProgram.trainingId}</p>
                      <p><span className="font-medium">Location Category:</span> {selectedProgram.locationCategory}</p>
                      <p><span className="font-medium">Training Group:</span> {groupDisplay(selectedProgram.trainingGroup)}</p>
                      <p><span className="font-medium">Training Type:</span> {renderTrainingType(selectedProgram.trainingType)}</p>
                      <p className="col-span-2"><span className="font-medium">Description:</span> {selectedProgram.description || "—"}</p>
                    </div>
                  </div>
                )}

                {/* ─── Training Details ─── */}
                <h3 className="text-md font-semibold text-blue-600 uppercase tracking-wider border-b border-blue-200 pb-2 mb-4 mt-6">
                  Training Details
                </h3>

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
                    <label className="text-sm font-medium">Country *</label>
                    <SearchableCountrySelect
                      value={formData.country}
                      onChange={(val) => setFormData({ ...formData, country: val })}
                      placeholder="Select Country"
                    />
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

                {/* ─── Employee Attendees ─── */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-md font-semibold text-blue-600 uppercase tracking-wider border-b border-blue-200 pb-2 mb-4">
                    Employee Attendees
                  </h3>

                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or CID..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="w-full border rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                  </div>
                  <div className="border rounded max-h-48 overflow-y-auto">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No employees found</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <label
                          key={emp._id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={isEmployeeSelected(emp._id)}
                            onChange={() => toggleEmployee(emp._id)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{emp.fullName}</span>
                            <span className="text-xs text-gray-500 ml-2">({emp.cidNumber})</span>
                            {emp.positionTitle && (
                              <span className="text-xs text-gray-400 ml-2">– {emp.positionTitle}</span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">
                      Selected: {(formData.employees || []).length} employee(s)
                    </span>
                    {(formData.employees || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.employees.map((empId) => {
                          const emp = employeesList.find((e) => e._id === empId);
                          return emp ? (
                            <span
                              key={empId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {emp.fullName}
                              <button
                                onClick={() => toggleEmployee(empId)}
                                className="hover:text-red-600 ml-1"
                                type="button"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
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
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Update
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── VIEW TABS ────────────────────────────────── */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => { setViewTab("training"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-medium transition ${
              viewTab === "training"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            By Training
          </button>
          <button
            onClick={() => { setViewTab("employee"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-medium transition ${
              viewTab === "employee"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            By Employee
          </button>
        </div>

        {/* ─── TOOLBAR ───────────────────────────────────── */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-96">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder={
                  viewTab === "training"
                    ? "Search by ID, title, status, location, category, type, or cost..."
                    : "Search by employee name, CID, position, or training..."
                }
                className="w-full px-4 py-2 pr-10 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            {viewTab === "training" && (
              <button
                onClick={() => setShowTrainingFilters(!showTrainingFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition ${
                  showTrainingFilters ? "bg-blue-50 border-blue-400 text-blue-600" : "hover:border-gray-400"
                }`}
              >
                <Filter size={16} />
                Filters
                {Object.values(trainingFilters).some(v => v) && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            )}
            {viewTab === "employee" && (
              <button
                onClick={() => setShowEmployeeFilters(!showEmployeeFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition ${
                  showEmployeeFilters ? "bg-blue-50 border-blue-400 text-blue-600" : "hover:border-gray-400"
                }`}
              >
                <Filter size={16} />
                Filters
                {Object.values(employeeFilters).some(v => v) && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            )}
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

        {/* ─── FILTER PANELS ────────────────────────────── */}
        {viewTab === "training" && showTrainingFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Training Filters</h3>
              <button
                onClick={clearTrainingFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <XCircle size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Training Group</label>
                <select
                  value={trainingFilters.trainingGroup}
                  onChange={(e) => setTrainingFilters({ ...trainingFilters, trainingGroup: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Groups</option>
                  {trainingFilterOptions.trainingGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Training Type</label>
                <select
                  value={trainingFilters.trainingType}
                  onChange={(e) => setTrainingFilters({ ...trainingFilters, trainingType: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Types</option>
                  {trainingFilterOptions.trainingTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Location Category</label>
                <select
                  value={trainingFilters.locationCategory}
                  onChange={(e) => setTrainingFilters({ ...trainingFilters, locationCategory: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Locations</option>
                  {trainingFilterOptions.locationCategories.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                <select
                  value={trainingFilters.status}
                  onChange={(e) => setTrainingFilters({ ...trainingFilters, status: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Statuses</option>
                  {trainingFilterOptions.statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Country</label>
                <select
                  value={trainingFilters.country}
                  onChange={(e) => setTrainingFilters({ ...trainingFilters, country: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Countries</option>
                  {trainingFilterOptions.countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {viewTab === "employee" && showEmployeeFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Employee Filters</h3>
              <button
                onClick={clearEmployeeFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <XCircle size={14} /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Department</label>
                <select
                  value={employeeFilters.department}
                  onChange={(e) => setEmployeeFilters({ ...employeeFilters, department: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Departments</option>
                  {employeeFilterOptions.departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Division</label>
                <select
                  value={employeeFilters.division}
                  onChange={(e) => setEmployeeFilters({ ...employeeFilters, division: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Divisions</option>
                  {employeeFilterOptions.divisions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Position Level</label>
                <select
                  value={employeeFilters.positionLevel}
                  onChange={(e) => setEmployeeFilters({ ...employeeFilters, positionLevel: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Levels</option>
                  {employeeFilterOptions.positionLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Training Status</label>
                <select
                  value={employeeFilters.trainingStatus}
                  onChange={(e) => setEmployeeFilters({ ...employeeFilters, trainingStatus: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Statuses</option>
                  {employeeFilterOptions.trainingStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── TABLE ──────────────────────────────────────── */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {viewTab === "training" ? (
            // ─── TRAINING TABLE ──────────────────────────
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("programTitle")}>
                    TRAINING
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("dateRange")}>
                    DATE RANGE
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("status")}>
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("totalCost")}>
                    TOTAL COST (Nu.)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("locationCategory")}>
                    LOCATION CATEGORY
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("trainingCategoryType")}>
                    CATEGORY / TYPE
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("employees")}>
                    TOTAL PARTICIPANTS
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("certification")}>
                    CERTIFICATION
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-6 text-gray-500">Loading...</td></tr>
                ) : paginated.length > 0 ? (
                  paginated.map((item) => {
                    const trainingGroup = item.programTitle?.trainingGroup || "";
                    const trainingType = renderTrainingType(item.programTitle?.trainingType);
                    const fullTitle = item.programTitle?.title || "—";
                    const truncatedTitle = truncateWords(fullTitle, 3);
                    return (
                      <tr key={item._id} className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-3 text-sm">
                          <div className="font-medium text-gray-800" title={fullTitle}>
                            {truncatedTitle}
                          </div>
                          <div className="text-xs text-gray-500">{item.programTitle?.trainingId || ""}</div>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {item.startDate && item.endDate ? (
                            `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === "Scheduled" ? "bg-blue-100 text-blue-700" :
                            item.status === "In progress" ? "bg-yellow-100 text-yellow-700" :
                            item.status === "Completed" ? "bg-green-100 text-green-700" :
                            item.status === "Cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {item.totalCost ? Number(item.totalCost).toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="font-medium text-gray-800">{item.programTitle?.locationCategory || "—"}</div>
                          <div className="text-xs text-gray-500">{item.country || ""}</div>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="font-medium text-gray-800">{groupDisplay(trainingGroup) || "—"}</div>
                          <div className="text-xs text-gray-500">{trainingType || ""}</div>
                        </td>
                        <td className="px-6 py-3 text-sm text-center">
                          {item.employees?.length || 0}
                        </td>
                        <td className="px-6 py-3 text-sm">{item.certification ? "✅ Yes" : "❌ No"}</td>
                        <td className="px-6 py-3 text-sm flex gap-2">
                          <button onClick={() => handleView(item)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition">
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => handleDelete(item)} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-black transition">
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="9" className="text-center py-6 text-gray-500">No records found</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            // ─── EMPLOYEE TABLE ──────────────────────────
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase">PHOTO</th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("fullName")}>
                    Employee Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("employeeNumber")}>
                    Employee ID / CID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("positionTitle")}>
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("totalAttended")} title="Total number of trainings attended">
                    Total Attended
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("lastDate")} title="Most recent training end date">
                    Last Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("gap")} title="Time since last training (years/months)">
                    Gap
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none" onClick={() => handleSort("email")}>
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-6 text-gray-500">Loading...</td></tr>
                ) : paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp) => {
                    const photoUrl = emp.passportPhoto;
                    const isExpanded = expandedEmpRow === emp._id;

                    let gapBadgeClass = "bg-gray-100 text-gray-700";
                    let gapLabel = emp.gap || "—";
                    if (emp.gap) {
                      const num = parseInt(emp.gap);
                      if (!isNaN(num)) {
                        if (num <= 0.5) gapBadgeClass = "bg-green-100 text-green-700";
                        else if (num <= 1) gapBadgeClass = "bg-yellow-100 text-yellow-700";
                        else gapBadgeClass = "bg-red-100 text-red-700";
                      }
                    }

                    return (
                      <React.Fragment key={emp._id}>
                        <tr className="hover:bg-gray-100 transition-colors">
                          <td className="px-6 py-3 text-sm">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={emp.fullName}
                                  className="w-10 h-10 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div className={`absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-600 bg-blue-100 ${photoUrl ? 'opacity-0 hover:opacity-75' : ''}`}>
                                {emp.fullName?.charAt(0) || "?"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium">{emp.fullName}</td>
                          <td className="px-6 py-3 text-sm">
                            <div className="font-medium text-gray-800">{emp.employeeNumber || "—"}</div>
                            <div className="text-xs text-gray-500">{emp.cidNumber || ""}</div>
                          </td>
                          <td className="px-6 py-3 text-sm">{formatPosition(emp)}</td>
                          <td className="px-6 py-3 text-sm text-center font-bold">{emp.totalAttended}</td>
                          <td className="px-6 py-3 text-sm">{emp.lastDate ? formatDate(emp.lastDate) : "—"}</td>
                          <td className="px-6 py-3 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gapBadgeClass}`}>
                              {gapLabel}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm">
                            {emp.email ? (
                              <a href={`mailto:${emp.email}`} className="text-blue-600 hover:underline">
                                {emp.email}
                              </a>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-3 text-sm flex gap-2">
                            {emp.trainings && emp.trainings.length > 0 && (
                              <button
                                onClick={() => toggleEmpRow(emp._id)}
                                className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs font-medium hover:border-blue-500 hover:text-blue-500 transition"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isExpanded ? 'Hide' : 'View'} Trainings ({emp.trainings.length})
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" className="px-6 py-3 bg-gray-50">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Trainings Attended</h4>
                                {emp.trainings && emp.trainings.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Training ID</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Location Category</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Training Type</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Country</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Place</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Start Date</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">End Date</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {emp.trainings.map((t, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-mono">{t.trainingId || "—"}</td>
                                            <td className="px-3 py-2" title={t.title || "—"}>
                                              {truncateWords(t.title, 3)}
                                            </td>
                                            <td className="px-3 py-2">{t.locationCategory || "—"}</td>
                                            <td className="px-3 py-2">{renderTrainingType(t.trainingType)}</td>
                                            <td className="px-3 py-2">{t.country || "—"}</td>
                                            <td className="px-3 py-2">{t.place || "—"}</td>
                                            <td className="px-3 py-2">{t.startDate ? formatDate(t.startDate) : "—"}</td>
                                            <td className="px-3 py-2">{t.endDate ? formatDate(t.endDate) : "—"}</td>
                                            <td className="px-3 py-2">
                                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                t.status === "Scheduled" ? "bg-blue-100 text-blue-700" :
                                                t.status === "In progress" ? "bg-yellow-100 text-yellow-700" :
                                                t.status === "Completed" ? "bg-green-100 text-green-700" :
                                                t.status === "Cancelled" ? "bg-red-100 text-red-700" :
                                                "bg-gray-100 text-gray-700"
                                              }`}>
                                                {t.status || "—"}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-center py-2">No trainings attended</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr><td colSpan="9" className="text-center py-6 text-gray-500">No employees found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── PAGINATION ────────────────────────────────── */}
        {viewTab === "training" && totalPages > 1 && (
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
        {viewTab === "employee" && totalEmpPages > 1 && (
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
              Page {currentPage} of {totalEmpPages}
            </span>
            <button
              disabled={currentPage === totalEmpPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`font-semibold text-lg ${
                currentPage === totalEmpPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "hover:text-blue-600"
              }`}
            >
              &gt;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}