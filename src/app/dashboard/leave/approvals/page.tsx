"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "react-icons/fa";

// ---------- Types (same as before) ----------
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
  name: string;
  division: string;
  department: string;
  firstIn: string | null;
  lastOut: string | null;
  status: string;
  inColor: string;
  outColor: string;
};

// ---------- Helper functions ----------
function getOriginalFileName(savedName: string): string {
  const firstDashIndex = savedName.indexOf("-");
  if (firstDashIndex === -1) return savedName;
  return savedName.substring(firstDashIndex + 1);
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return <FaFilePdf className="text-red-600" />;
    case "doc": case "docx": return <FaFileWord className="text-blue-700" />;
    case "xls": case "xlsx": return <FaFileExcel className="text-green-700" />;
    case "jpg": case "jpeg": case "png": case "gif": case "webp": return <FaFileImage className="text-purple-600" />;
    default: return <FaFileAlt className="text-gray-600" />;
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
    } catch (err) {
      console.error(err);
      setAttError(err.message);
      setSubordinates([]);
    } finally {
      setAttLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTeamAttendance();
  }, [fetchTeamAttendance]);

  // Filter subordinates by status
  const filteredSubordinates = subordinates.filter(officer => {
    if (statusFilter === "all") return true;
    if (statusFilter === "late" && (officer.status === "Late arrival" || officer.status === "Late & Early")) return true;
    if (statusFilter === "present" && officer.status === "Present") return true;
    if (statusFilter === "early" && officer.status === "Early departure") return true;
    if (statusFilter === "absent" && officer.status === "No punch") return true;
    return false;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Name", "Division", "Department", "First In", "Last Out", "Status"];
    const rows = filteredSubordinates.map(o => [
      o.name,
      o.division,
      o.department,
      o.firstIn || "-",
      o.lastOut || "-",
      o.status,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team_attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Leave approval actions (unchanged) ----------
  const handleAction = async (applicationId: string, action: "approve" | "reject") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setProcessingId(applicationId);
    setMessage("");
    try {
      const res = await fetch("/api/leave-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId, action, remarks: remarksById[applicationId] || "" }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data?.error || "Failed"); return; }
      setApplications(prev => prev.map(item => item._id === applicationId ? { ...item, status: action === "approve" ? "approved" : "rejected" } : item));
      setMessage(data?.message || "Updated");
    } catch (error) {
      setMessage("Failed to process");
    } finally {
      setProcessingId("");
    }
  };

  const filteredApplications = activeTab === "all" ? applications : applications.filter(item => item.status === activeTab);
  const counts = { all: applications.length, pending: applications.filter(a => a.status === "pending").length, approved: applications.filter(a => a.status === "approved").length, rejected: applications.filter(a => a.status === "rejected").length };

  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:ml-64 w-full">
        <Flex direction={{ initial: "column", sm: "row" }} align="center" justify="between" mb="5" gap="3">
          <Box>
            <Heading size="6">Leave Approvals & Team Monitoring</Heading>
            <Text size="2" color="gray">Approve/reject leave requests and monitor daily attendance of your team.</Text>
          </Box>
          <Button variant="soft" onClick={() => router.push("/dashboard/leave")}>Leave Dashboard</Button>
        </Flex>

        {/* ========== NEW: SUPERVISOR ATTENDANCE SECTION ========== */}
        <Card size="3" mb="5">
          <Heading size="4" mb="3">📅 Team Attendance Overview</Heading>
          <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
            <Flex gap="2" align="center">
              <Text size="2" weight="bold">Date:</Text>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
              />
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
          </Flex>

          {attLoading && <Text>Loading team attendance...</Text>}
          {attError && <Text color="red">{attError}</Text>}
          {!attLoading && !attError && (
            <div className="overflow-x-auto">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Department</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>First In</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Last Out</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredSubordinates.map((officer) => (
                    <Table.Row key={officer.userId}>
                      <Table.RowHeaderCell>{officer.name}</Table.RowHeaderCell>
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
                        <Button
                          variant="soft"
                          size="1"
                          onClick={() => router.push(`/dashboard/leave/attendance/history?userId=${officer.userId}`)}
                        >
                          View History
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                  {filteredSubordinates.length === 0 && (
                    <Table.Row><Table.Cell colSpan={7} align="center"><Text color="gray">No team members found</Text></Table.Cell></Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </Card>

        {/* ========== EXISTING LEAVE APPROVALS SECTION ========== */}
        <Card size="3">
          <Flex gap="2" mb="4" wrap="wrap">
            {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
              <Button key={tab} size="2" variant={activeTab === tab ? "solid" : "soft"} onClick={() => setActiveTab(tab)} style={{ position: "relative" }}>
                {tab.toUpperCase()} ({counts[tab]})
                {tab === "pending" && counts.pending > 0 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-6px", minWidth: "18px", height: "18px", padding: "0 5px", borderRadius: "999px", backgroundColor: "red", color: "white", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {counts.pending}
                  </span>
                )}
              </Button>
            ))}
          </Flex>

          {loading ? (
            <Text color="gray">Loading approvals...</Text>
          ) : filteredApplications.length === 0 ? (
            <Text color="gray">No records found.</Text>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table.Root variant="surface" style={{ minWidth: "1100px", width: "100%" }}>
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
                  {filteredApplications.map((item) => (
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
                        <Select.Root
                          value={item.status}
                          disabled={item.status !== "pending" || processingId === item._id}
                          onValueChange={(value) => {
                            if (item.status !== "pending") return;
                            const confirmed = confirm(`Are you sure you want to mark this request as ${value}?`);
                            if (!confirmed) return;
                            handleAction(item._id, value === "approved" ? "approve" : "reject");
                          }}
                        >
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