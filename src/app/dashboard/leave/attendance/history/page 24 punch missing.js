"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Card,
  Flex,
  Heading,
  Table,
  Text,
  Button,
  Badge,
  Select,
} from "@radix-ui/themes";
import { FaDownload, FaCalendarAlt } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const targetEmpCode = searchParams.get("empCode");

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingUserName, setViewingUserName] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const token = localStorage.getItem("token");

      let url = `/api/attendance?startDate=${startStr}&endDate=${endStr}`;
      if (targetEmpCode) {
        url += `&empCode=${targetEmpCode}`;
      } else if (targetUserId) {
        url += `&userId=${targetUserId}`;
      }

      console.log("Fetching attendance with URL:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch: ${res.status} ${errText}`);
      }
      const data = await res.json();
      console.log("Attendance data received:", data.attendance?.length || 0, "records");

      if (data.userName) {
        setViewingUserName(data.userName);
      } else if (targetUserId) {
        setViewingUserName("this officer");
      } else {
        setViewingUserName("");
      }

      setAttendance(data.attendance || []);
    } catch (err) {
      console.error("History fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [year, month, targetUserId, targetEmpCode]); // only re-fetch when month/year changes or target changes

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToCurrentMonth = () => setCurrentDate(new Date());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split("T")[0];
  });

  const attendanceByDate = {};
  attendance.forEach((item) => {
    const dateObj = new Date(item.date);
    const key = dateObj.toISOString().split("T")[0];
    attendanceByDate[key] = item;
  });

  const chartData = [
    { name: "Present", value: 0, color: "#22c55e" },
    { name: "Late", value: 0, color: "#f97316" },
    { name: "Early", value: 0, color: "#f97316" },
    { name: "Absent", value: 0, color: "#94a3b8" },
  ];
  attendance.forEach((item) => {
    if (item.status === "Present") chartData[0].value++;
    else if (item.status === "Late arrival" || item.status === "Late & Early") chartData[1].value++;
    else if (item.status === "Early departure") chartData[2].value++;
    else if (item.status === "No punch") chartData[3].value++;
  });

  const monthName = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const exportToCSV = () => {
    const headers = ["Date", "First In", "Last Out", "Status"];
    const rows = allDates.map(dateStr => {
      const day = attendanceByDate[dateStr];
      const displayDate = new Date(dateStr).toLocaleDateString("en-GB");
      return [
        displayDate,
        day?.firstIn || "-",
        day?.lastOut || "-",
        day?.status || "No punch",
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${year}_${month + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWeekday = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { weekday: "short" });
  };

  const getNormalizedStatus = (status) => {
    if (status === "Present") return "Present";
    if (status === "Late arrival" || status === "Late & Early") return "Late";
    if (status === "Early departure") return "Early";
    if (status === "No punch") return "Absent";
    return "Other";
  };

  const filteredDates = allDates.filter(dateStr => {
    const day = attendanceByDate[dateStr];
    const rawStatus = day?.status || "No punch";
    const normalized = getNormalizedStatus(rawStatus);
    if (statusFilter === "all") return true;
    return normalized === statusFilter;
  });

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 ml-0 lg:ml-64">
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
          <Heading size="6">
            📊 Biometric Attendance History
            {viewingUserName && ` – ${viewingUserName}`}
          </Heading>
          <Button variant="soft" onClick={() => router.push("/dashboard/leave")}>
            ← Back to Dashboard
          </Button>
        </Flex>

        <Card mb="4">
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Heading size="4">Attendance Summary for {monthName}</Heading>
            <Flex gap="2" align="center">
              <Button variant="soft" onClick={prevMonth} size="1">← Prev</Button>
              <Button variant="soft" onClick={nextMonth} size="1">Next →</Button>
              <Button variant="outline" onClick={goToCurrentMonth} size="1">
                <FaCalendarAlt className="mr-1" /> Current
              </Button>
              <Button variant="soft" onClick={exportToCSV} size="1">
                <FaDownload className="mr-1" /> Export CSV
              </Button>
            </Flex>
          </Flex>
          {loading && <Text>Loading chart data...</Text>}
          {error && <Text color="red">{error}</Text>}
          {!loading && !error && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
            <Heading size="4">Daily Details</Heading>
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Filter by status:</Text>
              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="Present">Present</Select.Item>
                  <Select.Item value="Late">Late</Select.Item>
                  <Select.Item value="Early">Early</Select.Item>
                  <Select.Item value="Absent">Absent / No punch</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Flex>

          {loading && (
            <div className="text-center py-8">
              <Text color="gray">Loading attendance data...</Text>
            </div>
          )}
          {error && (
            <div className="text-center py-8">
              <Text color="red">{error}</Text>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Day</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>First In</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Last Out</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredDates.map((dateStr) => {
                    const day = attendanceByDate[dateStr];
                    const displayDate = new Date(dateStr).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const weekday = getWeekday(dateStr);
                    const isWeekend = weekday === "Sat" || weekday === "Sun";
                    return (
                      <Table.Row key={dateStr} style={isWeekend ? { backgroundColor: "#f8fafc" } : {}}>
                        <Table.RowHeaderCell>{displayDate}</Table.RowHeaderCell>
                        <Table.Cell>
                          <Text size="1" color="gray">{weekday}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          {day?.firstIn ? (
                            <span className={day.firstClass}>{day.firstIn}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {day?.lastOut ? (
                            <span className={day.lastClass}>{day.lastOut}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {day?.status ? (
                            <Badge
                              color={
                                day.status === "Present" ? "green" :
                                day.status.includes("Late") ? "orange" :
                                day.status.includes("Early") ? "orange" :
                                "gray"
                              }
                              variant="soft"
                            >
                              {day.status}
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="soft">No punch</Badge>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                  {filteredDates.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={5} align="center">
                        <Text size="2" color="gray">No records match the filter</Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}