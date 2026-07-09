"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
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
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
} from "react-icons/fa";

type LeaveEntry = {
  leaveTypeName: string;
  allocated: number;
  used: number;
  balance: number;
};

type LeaveApplication = {
  _id: string;
  userName?: string;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  approverName?: string;
  attachments?: string[];
  attachmentName?: string;
  description?: string;
};

function normalizeRole(rawRole?: string): string {
  const normalized = (rawRole || "Officer")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const roleMap: Record<string, string> = {
    officer: "Officer",
    divisionhead: "DivisionHead",
    departmenthead: "DepartmentHead",
    commissioner: "Commissioner",
    chairperson: "Chairperson",
    secretaryservice: "SecretaryService",
    admin: "Admin",
  };
  return roleMap[normalized] || "Officer";
}

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

const renderAttachments = (attachments?: string[]) => {
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
            <span className="truncate max-w-[150px]">{originalName}</span>
          </a>
        );
      })}
    </div>
  );
};

export default function LeaveDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(10);
  const [canApprove, setCanApprove] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visibilityLabel, setVisibilityLabel] = useState("My Leaves");

  // === SHARED BIOMETRIC DATA (last 5 days) ===
  const [biometricData, setBiometricData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // Selected date – we will restrict it to dates present in biometricData
  const [selectedDate, setSelectedDate] = useState("");

  // Extract sorted unique dates from biometricData
  const availableDates = useMemo(() => {
    const dates = biometricData.map(day => day.date.split("T")[0]);
    return [...new Set(dates)].sort().reverse(); // newest first
  }, [biometricData]);

  // Set initial selected date to the most recent available (usually today)
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Navigation helpers – move within availableDates
  const goPreviousDay = () => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  };
  const goNextDay = () => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };
  const goToday = () => {
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Load leave balances and applications (unchanged)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setMessage("");
      try {
        const profileRes = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAdmin");
          router.push("/login?expired=true");
          return;
        }
        const profile = await profileRes.json();
        const userId = profile?._id;
        const role = normalizeRole(profile?.role);
        const adminFromProfile = !!profile?.isAdmin;

        setIsAdmin(adminFromProfile);
        setCanApprove(
          adminFromProfile ||
            ["DivisionHead", "DepartmentHead", "Commissioner", "Chairperson", "SecretaryService"].includes(role)
        );

        if (!userId) {
          setMessage("Unable to load profile");
          return;
        }

        const [balanceRes, applicationsRes] = await Promise.all([
          fetch(`/api/leave-balances?userId=${userId}`),
          fetch("/api/my-leaves", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const balanceData = await balanceRes.json();
        const applicationsData = await applicationsRes.json();

        const leaves = Array.isArray(balanceData?.leaves) ? balanceData.leaves : [];
        setLeaveEntries(leaves);

        const apps = Array.isArray(applicationsData?.applications)
          ? applicationsData.applications.map((app: any) => ({
              ...app,
              attachments: app.attachments || (app.attachmentName ? app.attachmentName.split(", ") : []),
            }))
          : [];
        setApplications(apps);

        setVisibilityLabel(applicationsData?.visibilityLabel || "My Leaves");
      } catch (error) {
        console.error("Leave dashboard load error:", error);
        setMessage("Failed to load leave details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  // Fetch biometric data for the last 5 days (source of truth)
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setAttendanceLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/attendance?days=5", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch attendance");
        const data = await res.json();
        setBiometricData(data.attendance || []);
      } catch (err) {
        console.error("Attendance fetch error:", err);
      } finally {
        setAttendanceLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  // Find the record for the selected date directly from biometricData
  const selectedDayRecord = useMemo(() => {
    if (!selectedDate || !biometricData.length) return null;
    return biometricData.find(day => day.date.split("T")[0] === selectedDate);
  }, [biometricData, selectedDate]);

  // Compute attendance metrics from the selected record
  const todayAttendance = useMemo(() => {
    if (!selectedDayRecord) {
      return { present: 0, late: 0, early: 0, absent: 1, total: 1, status: "Absent" };
    }
    let present = 0, late = 0, early = 0, absent = 0, status = "";
    if (selectedDayRecord.leaveType) {
      absent = 1;
      status = "On Leave";
    } else if (selectedDayRecord.status === "Present") {
      present = 1;
      status = "Present";
    } else if (selectedDayRecord.status === "Late arrival" || selectedDayRecord.status === "Late & Early") {
      late = 1;
      status = "Late";
    } else if (selectedDayRecord.status === "Early departure") {
      early = 1;
      status = "Early";
    } else {
      absent = 1;
      status = "Absent";
    }
    return { present, late, early, absent, total: 1, status };
  }, [selectedDayRecord]);

  const attendanceRate = todayAttendance.present * 100;
  const concernLevel = todayAttendance.present === 1 ? "Good" :
                       (todayAttendance.late === 1 || todayAttendance.early === 1) ? "Moderate Concern" : "Critical Concern";

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  // Leave balances (only positive)
  const leaveBalancesList = useMemo(() => {
    return leaveEntries.filter(entry => entry.balance > 0).map(entry => ({
      name: entry.leaveTypeName,
      balance: entry.balance,
    }));
  }, [leaveEntries]);

  // Applications filtering
  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((row) => {
      return [
        row.leaveTypeName || "",
        row.fromDate || "",
        row.toDate || "",
        row.status || "",
      ].join(" ").toLowerCase().includes(q);
    });
  }, [applications, search]);

  const rowsToShow = rowsPerPage === "all" ? filteredApplications : filteredApplications.slice(0, rowsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Text color="gray">Loading leave details...</Text>
      </div>
    );
  }

  // Disable navigation buttons when at boundaries
  const isFirstDate = selectedDate === availableDates[0];
  const isLastDate = selectedDate === availableDates[availableDates.length - 1];

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 ml-0 lg:ml-64 w-full overflow-x-hidden">
        {/* HEADER */}
        <Flex align="center" justify="between" mb="5" wrap="wrap" gap="3">
          <Box>
            <h5 className="text-lg md:text-xl font-semibold tracking-tight">
              Leave Section -{" "}
              <span className="text-gray-600 text-xs md:text-sm font-normal">
                Track balance and leave status.
              </span>
            </h5>
          </Box>
          <Flex gap="2" wrap="wrap">
            {!isAdmin && <Button onClick={() => router.push("/dashboard/leave/apply")}>Apply Leave</Button>}
            {canApprove && <Button variant="soft" onClick={() => router.push("/dashboard/leave/approvals")}>Leave Approvals</Button>}
          </Flex>
        </Flex>

        {/* DASHBOARD CARD: Leave Balances + Attendance Summary (now fully linked to biometricData) */}
        <Card size="3" mb="4" className="border-t-4 border-t-blue-500">
          <Heading size="4" mb="3" className="text-blue-800">📊 My Leave Dashboard</Heading>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Leave Balances */}
            <div className="flex-1">
              <Text size="2" weight="bold" mb="2" className="text-gray-700">Leave Balances</Text>
              <Flex wrap="wrap" gap="3">
                {leaveBalancesList.length > 0 ? (
                  leaveBalancesList.map((item, idx) => (
                    <Box key={idx} className="bg-blue-50 px-4 py-2 rounded-lg shadow-sm border border-blue-100">
                      <Text size="2" color="gray">{item.name}</Text>
                      <Text size="5" weight="bold" className="block text-blue-700">{item.balance}</Text>
                    </Box>
                  ))
                ) : (
                  <Text size="2" color="gray">No leave balances available</Text>
                )}
              </Flex>
            </div>

            {/* Attendance Summary – only shows dates that exist in the recent activity */}
            <div className="flex-1">
              <Flex justify="between" align="center" wrap="wrap" gap="2" mb="2">
                <Text size="2" weight="bold" className="text-gray-700">
                  📅 Attendance Summary – {selectedDate ? formatDisplayDate(selectedDate) : "No data"}
                </Text>
                {availableDates.length > 0 && (
                  <Flex gap="1" align="center">
                    <Button variant="soft" size="1" onClick={goPreviousDay} disabled={isLastDate}>
                      <FaChevronLeft className="mr-1" /> Prev
                    </Button>
                    <Button variant="soft" size="1" onClick={goToday} disabled={isFirstDate}>
                      <FaCalendarDay className="mr-1" /> Today
                    </Button>
                    <Button variant="soft" size="1" onClick={goNextDay} disabled={isFirstDate}>
                      Next <FaChevronRight className="ml-1" />
                    </Button>
                  </Flex>
                )}
              </Flex>

              {attendanceLoading ? (
                <div className="flex justify-center py-8"><Text size="2" color="gray">Loading attendance...</Text></div>
              ) : !selectedDayRecord ? (
                <div className="flex justify-center py-8"><Text size="2" color="gray">No attendance data for this date</Text></div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={attendanceRate >= 80 ? "#22c55e" : attendanceRate >= 50 ? "#f97316" : "#ef4444"}
                        strokeWidth="10"
                        strokeDasharray={`${(attendanceRate / 100) * 283} 283`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">{attendanceRate}%</text>
                    </svg>
                  </div>
                  <Text size="3" weight="bold" className={`mt-2 ${concernLevel === "Good" ? "text-green-600" : concernLevel === "Moderate Concern" ? "text-orange-600" : "text-red-600"}`}>
                    {concernLevel}
                  </Text>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 w-full">
                    <div className="bg-green-50 rounded-lg p-2 text-center shadow-sm">
                      <Text size="2" color="gray">Present</Text>
                      <Text size="5" weight="bold" className="text-green-700">{todayAttendance.present}</Text>
                      <Text size="1" className="text-green-600">{getPercentage(todayAttendance.present, todayAttendance.total)}</Text>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center shadow-sm">
                      <Text size="2" color="gray">Late</Text>
                      <Text size="5" weight="bold" className="text-orange-700">{todayAttendance.late}</Text>
                      <Text size="1" className="text-orange-600">{getPercentage(todayAttendance.late, todayAttendance.total)}</Text>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2 text-center shadow-sm">
                      <Text size="2" color="gray">Early</Text>
                      <Text size="5" weight="bold" className="text-yellow-700">{todayAttendance.early}</Text>
                      <Text size="1" className="text-yellow-600">{getPercentage(todayAttendance.early, todayAttendance.total)}</Text>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center shadow-sm">
                      <Text size="2" color="gray">Absent</Text>
                      <Text size="5" weight="bold" className="text-red-700">{todayAttendance.absent}</Text>
                      <Text size="1" className="text-red-600">{getPercentage(todayAttendance.absent, todayAttendance.total)}</Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* MY RECENT ACTIVITY – uses the same biometricData */}
        <Card size="3" mb="4">
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Heading size="4">📋 My Recent Activity</Heading>
            <Button variant="soft" onClick={() => router.push("/dashboard/leave/attendance/history")}>View all →</Button>
          </Flex>
          <div className="overflow-x-auto">
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>First In</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Last Out</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status / Leave</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {attendanceLoading ? (
                  <Table.Row><Table.Cell colSpan={4} align="center"><Text size="2" color="gray">Loading attendance...</Text></Table.Cell></Table.Row>
                ) : biometricData.length === 0 ? (
                  <Table.Row><Table.Cell colSpan={4} align="center"><Text size="2" color="gray">No attendance data found</Text></Table.Cell></Table.Row>
                ) : (
                  biometricData.map((day, idx) => {
                    const rowDate = day.date.split("T")[0];
                    return (
                      <Table.Row key={idx}>
                        <Table.RowHeaderCell>{rowDate}</Table.RowHeaderCell>
                        {day.leaveType ? (
                          <>
                            <Table.Cell colSpan={2}>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${day.leaveTypeClass || "bg-purple-100 text-purple-800"}`}>
                                📌 {day.leaveType}
                              </span>
                            </Table.Cell>
                            <Table.Cell><span className="text-gray-500 text-xs">—</span></Table.Cell>
                          </>
                        ) : (
                          <>
                            <Table.Cell>
                              {day.firstIn ? <span className={`font-medium ${day.firstClass || "text-green-700"}`}>{day.firstIn}</span> : <span className="text-gray-400">—</span>}
                            </Table.Cell>
                            <Table.Cell>
                              {day.lastOut ? <span className={`font-medium ${day.lastClass || "text-green-700"}`}>{day.lastOut}</span> : <span className="text-gray-400">—</span>}
                            </Table.Cell>
                            <Table.Cell><span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{day.status || "Absent"}</span></Table.Cell>
                          </>
                        )}
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Root>
          </div>
          <Text size="1" color="gray" mt="2" className="block text-center">
            ⏱️ <span className="text-green-700">● green</span> = on time (in ≤ 09:15, out ≥ 17:00) &nbsp;|&nbsp;
            <span className="text-orange-600">● orange</span> = late (&gt;09:15) or early departure (&lt;17:00)
          </Text>
        </Card>

        {/* APPLICATIONS TABLE (unchanged) */}
        <Card size="3">
          <Flex align="center" justify="between" mb="4" wrap="wrap" gap="3">
            <Heading size="4">{visibilityLabel}</Heading>
            <Text size="2" color="gray">You are seeing leave records within your allowed scope.</Text>
          </Flex>
          <Flex align="center" justify="between" mb="4" wrap="wrap" gap="3">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Show</Text>
              <Select.Root value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(value === "all" ? "all" : Number(value))}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="10">10</Select.Item>
                  <Select.Item value="all">All</Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="2" color="gray">entries</Text>
            </Flex>
            <Box style={{ minWidth: 220, width: "100%", maxWidth: 300 }}>
              <TextField.Root placeholder="Search by type, date, status" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
          </Flex>
          <div className="overflow-x-auto">
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Sl.No</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Applicant</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>End Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>No. of Days</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Attachment</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Approver</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rowsToShow.length > 0 ? (
                  rowsToShow.map((row, index) => (
                    <Table.Row key={row._id}>
                      <Table.Cell>{index + 1}</Table.Cell>
                      <Table.Cell>{row.userName || "-"}</Table.Cell>
                      <Table.Cell>{row.leaveTypeName || "-"}</Table.Cell>
                      <Table.Cell>{row.fromDate ? new Date(row.fromDate).toLocaleDateString() : "-"}</Table.Cell>
                      <Table.Cell>{row.toDate ? new Date(row.toDate).toLocaleDateString() : "-"}</Table.Cell>
                      <Table.Cell>{row.days}</Table.Cell>
                      <Table.Cell>{renderAttachments(row.attachments)}</Table.Cell>
                      <Table.Cell>{row.description || "-"}</Table.Cell>
                      <Table.Cell>{row.approverName || "-"}</Table.Cell>
                      <Table.Cell>
                        <Badge color={row.status?.toLowerCase() === "approved" ? "green" : row.status?.toLowerCase() === "rejected" ? "red" : "amber"} variant="soft">
                          {row.status || "pending"}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row><Table.Cell colSpan={11}><Text size="2" color="gray">No leave applications found</Text></Table.Cell></Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
        {message && <Text size="2" color="red" mt="3">{message}</Text>}
      </main>
    </div>
  );
}