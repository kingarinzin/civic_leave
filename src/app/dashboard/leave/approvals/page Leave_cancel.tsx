"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Select } from "@radix-ui/themes";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileImage,
  FaFileAlt,
  FaDownload,
  FaTimes,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaUsers,
  FaUserCheck,
  FaUserSlash,
  FaClock,
  FaSun,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// -------------------- Types --------------------
type ApprovalApplication = {
  _id: string;
  userName: string;
  applicantRole: string;
  departmentName: string;
  divisionName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  attachments?: string[];
  attachmentName?: string;
};

type SubordinateAttendance = {
  userId: string;
  empCode: string;
  name: string;
  division: string;
  department: string;
  firstIn: string | null;
  lastOut: string | null;
  status: string;
  inColor: string;
  outColor: string;
};

type LeaveBalance = {
  leaveTypeName: string;
  allocated: number;
  used: number;
  balance: number;
};

// -------------------- Helper Functions --------------------
function getOriginalFileName(savedName: string): string {
  const firstDashIndex = savedName.indexOf("-");
  if (firstDashIndex === -1) return savedName;
  return savedName.substring(firstDashIndex + 1);
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FaFilePdf className="text-red-600" />;
    case "doc":
    case "docx":
      return <FaFileWord className="text-blue-700" />;
    case "xls":
    case "xlsx":
      return <FaFileExcel className="text-green-700" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FaFileImage className="text-purple-600" />;
    default:
      return <FaFileAlt className="text-gray-600" />;
  }
}

function renderAttachments(attachments?: string[]) {
  if (!attachments || attachments.length === 0) return "-";
  return (
    <div className="flex flex-col gap-1">
      {attachments.map((file, idx) => {
        const originalName = getOriginalFileName(file);
        const icon = getFileIcon(originalName);
        return (
          <a
            key={idx}
            href={`/uploads/leave-attachments/${encodeURIComponent(file)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm"
          >
            {icon}
            <span>{originalName}</span>
          </a>
        );
      })}
    </div>
  );
}

// -------------------- Main Component --------------------
export default function LeaveApprovalsPage() {
  const router = useRouter();

  // Leave approvals state
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [applications, setApplications] = useState<ApprovalApplication[]>([]);
  const [remarksById, setRemarksById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Supervisor attendance state
  const [subordinates, setSubordinates] = useState<SubordinateAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [attError, setAttError] = useState("");

  // Pagination for Team Attendance
  const [teamSearch, setTeamSearch] = useState("");
  const [rowsPerPageTeam, setRowsPerPageTeam] = useState<number | "all">(10);

  // Pagination for Leave Approvals
  const [approvalSearch, setApprovalSearch] = useState("");
  const [rowsPerPageApproval, setRowsPerPageApproval] = useState<number | "all">(10);

  // ========== Leave balances for subordinates ==========
  const [subordinateBalances, setSubordinateBalances] = useState<Record<string, LeaveBalance[]>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Fetch balances for a single user
  const fetchUserBalances = async (userId: string): Promise<LeaveBalance[]> => {
    const token = localStorage.getItem("token");
    if (!token) return [];
    try {
      const res = await fetch(`/api/leave-balances?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.leaves) ? data.leaves : [];
    } catch (err) {
      console.error(`Failed to fetch balances for ${userId}`, err);
      return [];
    }
  };

  // Helper: format balances with full leave type name and colon spacing
  const formatBalances = (balances: LeaveBalance[]): string => {
    if (!balances || balances.length === 0) return "—";
    return balances
      .filter(b => b.balance > 0)
      .map(b => `${b.leaveTypeName}: ${b.balance}`)
      .join(", ");
  };

  // Date helpers
  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  const goPreviousDay = () => setSelectedDate(prev => addDays(prev, -1));
  const goNextDay = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextDay = addDays(selectedDate, 1);
    if (nextDay > today) return;
    setSelectedDate(nextDay);
  };
  const goToday = () => setSelectedDate(new Date().toISOString().split("T")[0]);
  const formatDisplayDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ---------- Load leave approvals ----------
  const loadApplications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/leave-approvals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.clear();
        router.push("/login?expired=true");
        return;
      }
      const apps = Array.isArray(data?.applications) ? data.applications : [];
      const normalisedApps = apps.map((app: any) => ({
        ...app,
        attachments: app.attachments || (app.attachmentName ? app.attachmentName.split(", ").filter(Boolean) : []),
      }));
      setApplications(normalisedApps);
    } catch (error) {
      console.error("Leave approvals load error:", error);
      setMessage("Failed to load leave approvals");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // ---------- Load supervisor attendance ----------
  const fetchTeamAttendance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAttLoading(true);
    setAttError("");
    try {
      const res = await fetch(`/api/attendance/supervisor/overview?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch team attendance");
      const data = await res.json();
      setSubordinates(data.officers || []);
    } catch (err: any) {
      console.error(err);
      setAttError(err.message || "Unknown error");
      setSubordinates([]);
    } finally {
      setAttLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTeamAttendance();
  }, [fetchTeamAttendance]);

  // ---------- Dashboard summary stats with late/early ----------
  const attendanceSummary = useMemo(() => {
    let present = 0;
    let late = 0;
    let early = 0;
    let absent = 0;
    const total = subordinates.length;

    subordinates.forEach((officer) => {
      const status = officer.status;
      if (status === "Present") present++;
      else if (status === "Late arrival") late++;
      else if (status === "Late & Early") late++;
      else if (status === "Early departure") early++;
      else if (status === "No punch") absent++;
      else if (status === "Absent") absent++;
    });

    return { total, present, late, early, absent };
  }, [subordinates]);

  // ---------- KPI trend data (last 6 months, based on present rate) ----------
  const attendanceRate = attendanceSummary.total === 0 ? 0 : (attendanceSummary.present / attendanceSummary.total) * 100;
  const kpiData = useMemo(() => {
    const months = ["July", "August", "September", "October", "November", "December"];
    const baseRate = attendanceRate;
    const trend = months.map((month, idx) => {
      const fluctuation = Math.sin(idx) * 10 + (Math.random() * 5 - 2.5);
      let rate = Math.min(100, Math.max(0, baseRate + fluctuation));
      rate = Math.round(rate);
      return {
        month,
        Good: rate,
        Moderate: rate - 15 > 0 ? rate - 15 : 5,
        Critical: Math.max(0, rate - 35),
      };
    });
    return trend;
  }, [attendanceRate]);

  // ---------- Team Attendance filters & pagination ----------
  const filteredSubordinates = useMemo(() => {
    let filtered = [...subordinates];
    if (statusFilter !== "all") {
      filtered = filtered.filter((officer) => {
        if (statusFilter === "late" && (officer.status === "Late arrival" || officer.status === "Late & Early")) return true;
        if (statusFilter === "present" && officer.status === "Present") return true;
        if (statusFilter === "early" && officer.status === "Early departure") return true;
        if (statusFilter === "absent" && officer.status === "No punch") return true;
        return false;
      });
    }
    if (teamSearch.trim() !== "") {
      const searchLower = teamSearch.toLowerCase();
      filtered = filtered.filter(
        (officer) =>
          officer.name.toLowerCase().includes(searchLower) ||
          officer.division.toLowerCase().includes(searchLower) ||
          officer.department.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [subordinates, statusFilter, teamSearch]);

  const paginatedSubordinates = useMemo(() => {
    if (rowsPerPageTeam === "all") return filteredSubordinates;
    return filteredSubordinates.slice(0, rowsPerPageTeam);
  }, [filteredSubordinates, rowsPerPageTeam]);

  const handleTeamClearSearch = () => setTeamSearch("");

  // Fetch balances for displayed subordinates
  useEffect(() => {
    const missingUserIds = paginatedSubordinates
      .map(o => o.userId)
      .filter(id => id && !subordinateBalances[id]);
    if (missingUserIds.length === 0) return;

    const fetchAll = async () => {
      setBalancesLoading(true);
      const results = await Promise.all(
        missingUserIds.map(async (userId) => ({
          userId,
          balances: await fetchUserBalances(userId),
        }))
      );
      setSubordinateBalances(prev => {
        const newState = { ...prev };
        results.forEach(({ userId, balances }) => {
          newState[userId] = balances;
        });
        return newState;
      });
      setBalancesLoading(false);
    };
    fetchAll();
  }, [paginatedSubordinates, subordinateBalances]);

  // ---------- Leave Approvals filters & pagination ----------
  const tabFilteredApplications = useMemo(() => {
    if (activeTab === "all") return applications;
    return applications.filter((item) => item.status === activeTab);
  }, [applications, activeTab]);

  const filteredApprovals = useMemo(() => {
    if (!approvalSearch.trim()) return tabFilteredApplications;
    const searchLower = approvalSearch.toLowerCase();
    return tabFilteredApplications.filter((app) => {
      return (
        app.userName?.toLowerCase().includes(searchLower) ||
        app.leaveTypeName?.toLowerCase().includes(searchLower) ||
        app.status?.toLowerCase().includes(searchLower) ||
        app.description?.toLowerCase().includes(searchLower) ||
        new Date(app.fromDate).toLocaleDateString().includes(searchLower) ||
        new Date(app.toDate).toLocaleDateString().includes(searchLower)
      );
    });
  }, [tabFilteredApplications, approvalSearch]);

  const paginatedApprovals = useMemo(() => {
    if (rowsPerPageApproval === "all") return filteredApprovals;
    return filteredApprovals.slice(0, rowsPerPageApproval);
  }, [filteredApprovals, rowsPerPageApproval]);

  const handleApprovalClearSearch = () => setApprovalSearch("");

  // Export CSV
  const exportToCSV = () => {
    const headers = ["Name", "Division", "Department", "First In", "Last Out", "Status"];
    const rows = filteredSubordinates.map((o) => [
      o.name,
      o.division,
      o.department,
      o.firstIn || "-",
      o.lastOut || "-",
      o.status,
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team_attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Leave approval actions
  const handleAction = async (applicationId: string, action: "approve" | "reject") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setProcessingId(applicationId);
    setMessage("");
    try {
      const res = await fetch("/api/leave-approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId,
          action,
          remarks: remarksById[applicationId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed");
        return;
      }
      setApplications((prev) =>
        prev.map((item) =>
          item._id === applicationId
            ? { ...item, status: action === "approve" ? "approved" : "rejected" }
            : item
        )
      );
      setMessage(data?.message || "Updated");
    } catch (error) {
      setMessage("Failed to process");
    } finally {
      setProcessingId("");
    }
  };

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  const concernLevel = attendanceRate >= 80 ? "Good" : attendanceRate >= 60 ? "Moderate Concern" : "Critical Concern";

  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:ml-64 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <Flex direction={{ initial: "column", sm: "row" }} align={{ initial: "start", sm: "center" }} justify="between" mb="5" gap="3">
          <Box>
            <Heading size="6">Leave Approvals & Team Monitoring</Heading>
            <Text size="2" color="gray">Approve/reject leave requests and monitor daily attendance of your team.</Text>
          </Box>
          <Button variant="soft" onClick={() => router.push("/dashboard/leave")}>Leave Dashboard</Button>
        </Flex>

        {/* ==================== DASHBOARD (with Late & Early) ==================== */}
        <Card size="3" mb="5" className="w-full">
          <div className="flex flex-col gap-5">
            {/* Date navigation */}
            <Flex justify="between" align="center" wrap="wrap" gap="3">
              <Heading size="4">📊 Team Attendance – {formatDisplayDate(selectedDate)}</Heading>
              <Flex gap="2" align="center" wrap="wrap">
                <Button variant="outline" size="1" onClick={goPreviousDay}><FaChevronLeft className="mr-1" /> Previous</Button>
                <Button variant="outline" size="1" onClick={goToday}><FaCalendarDay className="mr-1" /> Today</Button>
                <Button variant="outline" size="1" onClick={goNextDay} disabled={selectedDate === new Date().toISOString().split("T")[0]}>Next <FaChevronRight className="ml-1" /></Button>
                <div className="border-l pl-2 ml-1">
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-2 py-1 border rounded-md text-sm" />
                </div>
              </Flex>
            </Flex>

            {/* Five metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total, Present, Late, Early, Absent cards - unchanged */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><FaUsers className="text-blue-600 text-xl" /></div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+5%</span>
                </div>
                <div className="mt-3">
                  <Text size="7" weight="bold" className="text-gray-800">{attendanceSummary.total}</Text>
                  <Text size="2" color="gray" className="block mt-1">Total Employees</Text>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center"><FaUserCheck className="text-green-600 text-xl" /></div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{getPercentage(attendanceSummary.present, attendanceSummary.total)}</span>
                </div>
                <div className="mt-3">
                  <Text size="7" weight="bold" className="text-gray-800">{attendanceSummary.present}</Text>
                  <Text size="2" color="gray" className="block mt-1">Present</Text>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center"><FaClock className="text-orange-600 text-xl" /></div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{getPercentage(attendanceSummary.late, attendanceSummary.total)}</span>
                </div>
                <div className="mt-3">
                  <Text size="7" weight="bold" className="text-gray-800">{attendanceSummary.late}</Text>
                  <Text size="2" color="gray" className="block mt-1">Late Arrival</Text>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center"><FaSun className="text-yellow-600 text-xl" /></div>
                  <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">{getPercentage(attendanceSummary.early, attendanceSummary.total)}</span>
                </div>
                <div className="mt-3">
                  <Text size="7" weight="bold" className="text-gray-800">{attendanceSummary.early}</Text>
                  <Text size="2" color="gray" className="block mt-1">Early Departure</Text>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"><FaUserSlash className="text-red-600 text-xl" /></div>
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">{getPercentage(attendanceSummary.absent, attendanceSummary.total)}</span>
                </div>
                <div className="mt-3">
                  <Text size="7" weight="bold" className="text-gray-800">{attendanceSummary.absent}</Text>
                  <Text size="2" color="gray" className="block mt-1">Absent</Text>
                </div>
              </div>
            </div>

            {/* KPI Chart + Attendance Summary - unchanged */}
            <div className="flex flex-col lg:flex-row gap-6 mt-2">
              <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <Heading size="3">KPI Metrics</Heading>
                  <span className="text-xs text-gray-500">Last 6 months</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpiData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Good" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Moderate" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Good</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical</span>
                </div>
                <Text size="1" color="gray" className="text-center mt-2">Attendance trend (last 6 months)</Text>
              </div>

              <div className="lg:w-80 xl:w-96 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <Heading size="3" className="text-center">Attendance Summary Today</Heading>
                <div className="flex flex-col items-center mt-2">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={attendanceRate >= 80 ? "#22c55e" : attendanceRate >= 60 ? "#f97316" : "#ef4444"} strokeWidth="10" strokeDasharray={`${(attendanceRate / 100) * 283} 283`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
                      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">{Math.round(attendanceRate)}%</text>
                    </svg>
                  </div>
                  <Text size="3" weight="bold" className={`mt-2 ${concernLevel === "Good" ? "text-green-600" : concernLevel === "Moderate Concern" ? "text-orange-600" : "text-red-600"}`}>{concernLevel}</Text>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <Text size="2" color="gray">Present</Text>
                    <Text size="5" weight="bold" className="text-green-700">{attendanceSummary.present}</Text>
                    <Text size="1" className="text-green-600">{getPercentage(attendanceSummary.present, attendanceSummary.total)}</Text>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <Text size="2" color="gray">Late</Text>
                    <Text size="5" weight="bold" className="text-orange-700">{attendanceSummary.late}</Text>
                    <Text size="1" className="text-orange-600">{getPercentage(attendanceSummary.late, attendanceSummary.total)}</Text>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2 text-center">
                    <Text size="2" color="gray">Early</Text>
                    <Text size="5" weight="bold" className="text-yellow-700">{attendanceSummary.early}</Text>
                    <Text size="1" className="text-yellow-600">{getPercentage(attendanceSummary.early, attendanceSummary.total)}</Text>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <Text size="2" color="gray">Absent</Text>
                    <Text size="5" weight="bold" className="text-red-700">{attendanceSummary.absent}</Text>
                    <Text size="1" className="text-red-600">{getPercentage(attendanceSummary.absent, attendanceSummary.total)}</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ==================== DETAILED TEAM ATTENDANCE TABLE (with Leave Balances column) ==================== */}
        <Card size="3" mb="5" className="w-full">
          <Heading size="4" mb="3">📋 Detailed Team Attendance</Heading>
          <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ initial: "stretch", md: "center" }} mb="4" gap="3" wrap="wrap">
            <Flex gap="2" align="center" wrap="wrap">
              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All status</Select.Item>
                  <Select.Item value="present">Present</Select.Item>
                  <Select.Item value="late">Late arrival</Select.Item>
                  <Select.Item value="early">Early departure</Select.Item>
                  <Select.Item value="absent">Absent / No punch</Select.Item>
                </Select.Content>
              </Select.Root>
              <Button variant="soft" size="1" onClick={exportToCSV}><FaDownload className="mr-1" /> Export CSV</Button>
            </Flex>
            <Flex gap="2" align="center" wrap="wrap">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">Show</Text>
                <Select.Root value={String(rowsPerPageTeam)} onValueChange={(value) => setRowsPerPageTeam(value === "all" ? "all" : Number(value))}>
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="10">10</Select.Item>
                    <Select.Item value="25">25</Select.Item>
                    <Select.Item value="50">50</Select.Item>
                    <Select.Item value="all">All</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text size="2" color="gray">entries</Text>
              </Flex>
              <Flex gap="2" align="center">
                <FaSearch className="text-gray-400" />
                <TextField.Root placeholder="Search name, division, dept" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} className="w-32 sm:w-40" />
                {teamSearch && <Button variant="soft" onClick={handleTeamClearSearch}><FaTimes className="mr-1" /> Clear</Button>}
              </Flex>
            </Flex>
          </Flex>
          <Text size="1" color="gray" mb="2">Showing {paginatedSubordinates.length} of {filteredSubordinates.length} entries{teamSearch && ` (filtered by "${teamSearch}")`}</Text>
          {attLoading && <Text>Loading team attendance...</Text>}
          {attError && <Text color="red">{attError}</Text>}
          {!attLoading && !attError && (
            <div className="overflow-x-auto w-full">
              <Table.Root variant="surface" className="min-w-[800px] md:min-w-0">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Leave Balances</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Department</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>First In</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Last Out</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedSubordinates.map((officer) => (
                    <Table.Row key={officer.userId}>
                      <Table.RowHeaderCell>{officer.name}</Table.RowHeaderCell>
                      <Table.Cell>
                        {balancesLoading && !subordinateBalances[officer.userId] ? (
                          <span className="text-gray-400 text-xs">Loading...</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-700">
                            {formatBalances(subordinateBalances[officer.userId] || [])}
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>{officer.division}</Table.Cell>
                      <Table.Cell>{officer.department}</Table.Cell>
                      <Table.Cell>
                        {officer.firstIn ? <span className={officer.inColor}>{officer.firstIn}</span> : <span className="text-gray-400">—</span>}
                      </Table.Cell>
                      <Table.Cell>
                        {officer.lastOut ? <span className={officer.outColor}>{officer.lastOut}</span> : <span className="text-gray-400">—</span>}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={officer.status === "Present" ? "green" : officer.status.includes("Late") || officer.status.includes("Early") ? "orange" : "gray"} variant="soft">
                          {officer.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Button variant="soft" size="1" onClick={() => router.push(`/dashboard/leave/attendance/history?userId=${officer.userId}&empCode=${officer.empCode}`)}>
                          View History
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                  {paginatedSubordinates.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={8} align="center">
                        <Text color="gray">No team members found</Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </Card>

        {/* ==================== LEAVE APPROVAL OVERVIEW (unchanged) ==================== */}
        <Card size="3" className="w-full overflow-x-hidden">
          <Heading size="4" mb="3">📋 Leave Approval Overview</Heading>
          <Flex gap="2" mb="4" wrap="wrap">
            {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
              <Button key={tab} size="2" variant={activeTab === tab ? "solid" : "soft"} onClick={() => setActiveTab(tab)} className="relative">
                {tab.toUpperCase()} ({counts[tab]})
                {tab === "pending" && counts.pending > 0 && <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">{counts.pending}</span>}
              </Button>
            ))}
          </Flex>
          <Flex direction={{ initial: "column", sm: "row" }} justify="between" align={{ initial: "stretch", sm: "center" }} mb="4" gap="3" wrap="wrap">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Show</Text>
              <Select.Root value={String(rowsPerPageApproval)} onValueChange={(value) => setRowsPerPageApproval(value === "all" ? "all" : Number(value))}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="10">10</Select.Item>
                  <Select.Item value="25">25</Select.Item>
                  <Select.Item value="50">50</Select.Item>
                  <Select.Item value="all">All</Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="2" color="gray">entries</Text>
            </Flex>
            <Flex gap="2" align="center" wrap="wrap">
              <FaSearch className="text-gray-400" />
              <TextField.Root placeholder="Search..user,status.." value={approvalSearch} onChange={(e) => setApprovalSearch(e.target.value)} className="w-32 sm:w-40" />
              {approvalSearch && <Button variant="soft" onClick={handleApprovalClearSearch}><FaTimes className="mr-1" /> Clear</Button>}
            </Flex>
          </Flex>
          <Text size="1" color="gray" mb="2">Showing {paginatedApprovals.length} of {filteredApprovals.length} entries{approvalSearch && ` (filtered by "${approvalSearch}")`}</Text>
          {loading ? <Text color="gray">Loading approvals...</Text> : filteredApprovals.length === 0 ? <Text color="gray">No records found.</Text> : (
            <div className="w-full overflow-x-auto">
              <Table.Root variant="surface" className="min-w-[1100px] w-full">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Applicant</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>End Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Attachment</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Approved Info</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedApprovals.map((item) => (
                    <Table.Row key={item._id} className={item.status !== "pending" ? "opacity-50 transition" : ""}>
                      <Table.Cell>{item.userName}</Table.Cell>
                      <Table.Cell>{item.leaveTypeName}</Table.Cell>
                      <Table.Cell>{new Date(item.fromDate).toLocaleDateString()}</Table.Cell>
                      <Table.Cell>{new Date(item.toDate).toLocaleDateString()}</Table.Cell>
                      <Table.Cell>{item.days} day(s)</Table.Cell>
                      <Table.Cell>{renderAttachments(item.attachments)}</Table.Cell>
                      <Table.Cell>{item.description}</Table.Cell>
                      <Table.Cell>
                        {item.status === "pending" && <Badge color="amber">Pending</Badge>}
                        {item.status === "approved" && <Badge color="green">Approved</Badge>}
                        {item.status === "rejected" && <Badge color="red">Rejected</Badge>}
                      </Table.Cell>
                      <Table.Cell>
                        {item.status !== "pending" ? (
                          <>
                            <Text size="2" weight="medium">{item.approvedBy || "—"}</Text>
                            <Text size="1" color="gray">{item.approvedAt ? new Date(item.approvedAt).toLocaleString() : ""}</Text>
                          </>
                        ) : <Text size="1" color="gray">—</Text>}
                      </Table.Cell>
                      <Table.Cell>
                        <Select.Root value={item.status} disabled={item.status !== "pending" || processingId === item._id} onValueChange={(value) => {
                          if (item.status !== "pending") return;
                          const confirmed = confirm(`Are you sure you want to mark this request as ${value}?`);
                          if (!confirmed) return;
                          handleAction(item._id, value === "approved" ? "approve" : "reject");
                        }}>
                          <Select.Trigger placeholder="Select action" />
                          <Select.Content>
                            <Select.Item value="approved">Approve</Select.Item>
                            <Select.Item value="rejected">Reject</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </Card>
        {message && <Text size="2" color={message.toLowerCase().includes("failed") ? "red" : "green"} mt="3">{message}</Text>}
      </main>
    </div>
  );
}