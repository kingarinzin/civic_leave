"use client";

import { useState, useEffect } from "react";
import { Trash2, Eye, EyeOff, Search, Users, Loader2, RefreshCw, Database } from "lucide-react";
import Sidebar from "@/components/Sidebar";

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
  const [expandedCid, setExpandedCid] = useState(null); // ✅ Track expanded row by CID

  // ================== LOAD EMPLOYEES FROM DB ==================
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

  // ================== SYNC EMPLOYEES FROM HR API ==================
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

  // ================== FETCH EMPLOYEE BY CID (ADD INDIVIDUAL) ==================
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
      console.error("Error fetching employee:", err);
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

  // ✅ Toggle inline view
  const toggleView = (cid) => {
    if (expandedCid === cid) {
      setExpandedCid(null); // collapse
    } else {
      setExpandedCid(cid); // expand
    }
  };

  const removeEmployee = (cid) => {
    if (!confirm(`Are you sure you want to remove this employee?`)) return;
    setEmployees((prev) => prev.filter((emp) => emp.cidNumber !== cid));
    if (expandedCid === cid) setExpandedCid(null); // close expanded row if removed
    showNotification("Employee removed from list", "success");
  };

  const clearAll = () => {
    if (!confirm(`Are you sure you want to clear all employees?`)) return;
    setEmployees([]);
    setExpandedCid(null);
    showNotification("All employees cleared", "success");
  };

  // ================== LOAD ON MOUNT ==================
  useEffect(() => {
    loadFromDatabase();
  }, []);

  // ================== FILTER & SORT ==================
  const filtered = employees.filter(
    (item) =>
      (item.fullName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.cidNumber?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.positionTitle?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (item.agency?.toLowerCase() || "").includes(search.toLowerCase())
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
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50"
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
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
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
                className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-xs font-medium hover:border-red-500 hover:text-red-500 transition"
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
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
            <span className="ml-4 text-gray-500">
              Total: {employees.length} employees
            </span>
          </div>
        </div>

        {/* Table with Inline Expansion */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">S/N</th>
                <th
                  onClick={() => handleSort("fullName")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "fullName" ? "bg-blue-100" : ""
                  }`}
                >
                  Full Name{" "}
                  {sortConfig.key === "fullName"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("cidNumber")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "cidNumber" ? "bg-blue-100" : ""
                  }`}
                >
                  CID Number{" "}
                  {sortConfig.key === "cidNumber"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("positionTitle")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "positionTitle" ? "bg-blue-100" : ""
                  }`}
                >
                  Position{" "}
                  {sortConfig.key === "positionTitle"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th
                  onClick={() => handleSort("agency")}
                  className={`px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer select-none ${
                    sortConfig.key === "agency" ? "bg-blue-100" : ""
                  }`}
                >
                  Agency{" "}
                  {sortConfig.key === "agency"
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : "▲▼"}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.length > 0 ? (
                paginated.map((item, index) => {
                  const isExpanded = expandedCid === item.cidNumber;
                  return (
                    <React.Fragment key={item.cidNumber}>
                      {/* Main row */}
                      <tr className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-3 text-sm">{startIndex + index + 1}</td>
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
                        <td className="px-6 py-3 text-sm">{item.agency}</td>
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
                      {/* ✅ Expanded details row (inline) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 bg-blue-50">
                            <div className="grid grid-cols-2 gap-4">
                              <DetailField label="Full Name" value={item.fullName} />
                              <DetailField label="CID Number" value={item.cidNumber} />
                              <DetailField label="Employee Number" value={item.employeeNumber} />
                              <DetailField label="Position Title" value={item.positionTitle} />
                              <DetailField
                                label="Position Level"
                                value={`${item.positionLevel || ""}${item.subLevel ? `-${item.subLevel}` : ""}`}
                              />
                              <DetailField label="Employee Type" value={item.empType} />
                              <DetailField label="Agency" value={item.agency} />
                              <DetailField label="Main Working Agency" value={item.mainWorkingAgency} />
                              <DetailField label="Department" value={item.department} />
                              <DetailField label="Division / Office" value={item.division} />
                              <DetailField label="Email" value={item.email} isLink={`mailto:${item.email}`} />
                              <DetailField label="Mobile" value={item.mobile} />
                              <DetailField label="Date of Birth" value={item.dateOfBirth} />
                              <DetailField label="Date of Appointment" value={item.dateOfAppointment} />
                              <DetailField label="Last Promotion" value={item.lastDateOfPromotion} />
                            </div>
                            {item.fullAgencyPath && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <label className="text-sm font-medium text-gray-500 block">Full Agency Path</label>
                                <p className="text-sm text-gray-700 mt-1">{item.fullAgencyPath}</p>
                              </div>
                            )}
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => setExpandedCid(null)}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
                              >
                                Close Details
                              </button>
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
    </div>
  );
}

// ============================================
// HELPER COMPONENT: Detail Field
// ============================================
function DetailField({ label, value, isLink }) {
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