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

  // Biometric attendance state
  const [biometricData, setBiometricData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

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
            [
              "DivisionHead",
              "DepartmentHead",
              "Commissioner",
              "Chairperson",
              "SecretaryService",
            ].includes(role)
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

        const leaves = Array.isArray(balanceData?.leaves)
          ? balanceData.leaves
          : [];
        setLeaveEntries(leaves);

        const apps = Array.isArray(applicationsData?.applications)
          ? applicationsData.applications.map((app: any) => ({
              ...app,
              attachments:
                app.attachments ||
                (app.attachmentName ? app.attachmentName.split(", ") : []),
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

  // Fetch biometric attendance data
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

  // Prepare leave balances list - only show balances > 0
  const leaveBalancesList = useMemo(() => {
    return leaveEntries
      .filter(entry => entry.balance > 0) // Only show leaves with remaining balance
      .map(entry => ({
        name: entry.leaveTypeName,
        balance: entry.balance
      }));
  }, [leaveEntries]);

  // Monthly attendance stats (current month)
  const monthlyAttendance = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    let present = 0;
    let absent = 0;
    let late = 0;

    biometricData.forEach(day => {
      const date = new Date(day.date);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        const status = day.status?.toLowerCase();
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (day.leaveType) absent++; // On leave => absent from work
      }
    });
    return { present, absent, late };
  }, [biometricData]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((row) => {
      return [
        row.leaveTypeName || "",
        row.fromDate || "",
        row.toDate || "",
        row.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [applications, search]);

  const rowsToShow =
    rowsPerPage === "all"
      ? filteredApplications
      : filteredApplications.slice(0, rowsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Text color="gray">Loading leave details...</Text>
      </div>
    );
  }

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
            {!isAdmin && (
              <Button onClick={() => router.push("/dashboard/leave/apply")}>
                Apply Leave
              </Button>
            )}
            {canApprove && (
              <Button
                variant="soft"
                onClick={() => router.push("/dashboard/leave/approvals")}
              >
                Leave Approvals
              </Button>
            )}
          </Flex>
        </Flex>

        {/* DASHBOARD CARD: Leave Balances + Monthly Attendance (moved to top) */}
        <Card size="3" mb="4">
          <Heading size="4" mb="3">📊 My Leave Dashboard</Heading>
          <Flex direction="column" gap="4">
            {/* Leave Balances Section - only shows balances > 0 */}
            <Box>
              <Text size="2" weight="bold" mb="2">Leave Balances</Text>
              <Flex wrap="wrap" gap="3">
                {leaveBalancesList.length > 0 ? (
                  leaveBalancesList.map((item, idx) => (
                    <Box key={idx} className="bg-slate-50 px-4 py-2 rounded-lg">
                      <Text size="2" color="gray">{item.name}</Text>
                      <Text size="5" weight="bold" className="block">{item.balance}</Text>
                    </Box>
                  ))
                ) : (
                  <Text size="2" color="gray">No leave balances available</Text>
                )}
              </Flex>
            </Box>

            {/* Monthly Attendance Section */}
            <Box className="border-t pt-3">
              <Text size="2" weight="bold" mb="2">
                📅 This Month ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
              </Text>
              <Flex wrap="wrap" gap="3">
                <Box className="bg-green-50 px-4 py-2 rounded-lg text-center">
                  <Text size="2" color="gray">Present</Text>
                  <Text size="5" weight="bold" className="block text-green-700">{monthlyAttendance.present}</Text>
                </Box>
                <Box className="bg-red-50 px-4 py-2 rounded-lg text-center">
                  <Text size="2" color="gray">Absent</Text>
                  <Text size="5" weight="bold" className="block text-red-700">{monthlyAttendance.absent}</Text>
                </Box>
                <Box className="bg-orange-50 px-4 py-2 rounded-lg text-center">
                  <Text size="2" color="gray">Late</Text>
                  <Text size="5" weight="bold" className="block text-orange-700">{monthlyAttendance.late}</Text>
                </Box>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* BIOMETRIC ATTENDANCE CARD (now below dashboard) */}
        <Card size="3" mb="4">
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Heading size="4">📋 My Recent Activity</Heading>
            <Button
              variant="soft"
              onClick={() => router.push("/dashboard/leave/attendance/history")}
            >
              View all →
            </Button>
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
                  <Table.Row>
                    <Table.Cell colSpan={4} align="center">
                      <Text size="2" color="gray">Loading attendance...</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : biometricData.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={4} align="center">
                      <Text size="2" color="gray">No attendance data found</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  biometricData.map((day, idx) => (
                    <Table.Row key={idx}>
                      <Table.RowHeaderCell>{day.date}</Table.RowHeaderCell>
                      {day.leaveType ? (
                        <>
                          <Table.Cell colSpan={2}>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${day.leaveTypeClass}`}
                            >
                              📌 {day.leaveType}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-gray-500 text-xs">—</span>
                          </Table.Cell>
                        </>
                      ) : (
                        <>
                          <Table.Cell>
                            {day.firstIn ? (
                              <span className={`font-medium ${day.firstClass}`}>
                                {day.firstIn}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {day.lastOut ? (
                              <span className={`font-medium ${day.lastClass}`}>
                                {day.lastOut}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                              {day.status}
                            </span>
                          </Table.Cell>
                        </>
                      )}
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </div>
          <Text size="1" color="gray" mt="2" className="block text-center">
            ⏱️ <span className="text-green-700">● green</span> = on time (in ≤
            09:15, out ≥ 17:00) &nbsp;|&nbsp;
            <span className="text-orange-600">● orange</span> = late (&gt;09:15)
            or early departure (&lt;17:00)
          </Text>
        </Card>

        {/* APPLICATIONS TABLE */}
        <Card size="3">
          <Flex align="center" justify="between" mb="4" wrap="wrap" gap="3">
            <Heading size="4">{visibilityLabel}</Heading>
            <Text size="2" color="gray">
              You are seeing leave records within your allowed scope.
            </Text>
          </Flex>

          <Flex align="center" justify="between" mb="4" wrap="wrap" gap="3">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                Show
              </Text>
              <Select.Root
                value={String(rowsPerPage)}
                onValueChange={(value) =>
                  setRowsPerPage(value === "all" ? "all" : Number(value))
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="10">10</Select.Item>
                  <Select.Item value="all">All</Select.Item>
                </Select.Content>
              </Select.Root>
              <Text size="2" color="gray">
                entries
              </Text>
            </Flex>
            <Box style={{ minWidth: 220, width: "100%", maxWidth: 300 }}>
              <TextField.Root
                placeholder="Search by type, date, status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                      <Table.Cell>
                        {row.fromDate
                          ? new Date(row.fromDate).toLocaleDateString()
                          : "-"}
                      </Table.Cell>
                      <Table.Cell>
                        {row.toDate
                          ? new Date(row.toDate).toLocaleDateString()
                          : "-"}
                      </Table.Cell>
                      <Table.Cell>{row.days}</Table.Cell>
                      <Table.Cell>{renderAttachments(row.attachments)}</Table.Cell>
                      <Table.Cell>{row.description || "-"}</Table.Cell>
                      <Table.Cell>{row.approverName || "-"}</Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={
                            row.status?.toLowerCase() === "approved"
                              ? "green"
                              : row.status?.toLowerCase() === "rejected"
                              ? "red"
                              : "amber"
                          }
                          variant="soft"
                        >
                          {row.status || "pending"}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={11}>
                      <Text size="2" color="gray">
                        No leave applications found
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </Card>
        {message && (
          <Text size="2" color="red" mt="3">
            {message}
          </Text>
        )}
      </main>
    </div>
  );
}