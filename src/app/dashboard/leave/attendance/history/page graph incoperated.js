"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Card,
  Flex,
  Heading,
  Table,
  Text,
  Button,
  Badge,
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
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState("");

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
      const res = await fetch(
        `/api/attendance?startDate=${startStr}&endDate=${endStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAttendance(data.attendance || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToCurrentMonth = () => setCurrentDate(new Date());

  // Generate all days of the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split("T")[0];
  });

  // Map attendance data by date
  const attendanceByDate = {};
  attendance.forEach((item) => {
    const dateObj = new Date(item.date);
    const key = dateObj.toISOString().split("T")[0];
    attendanceByDate[key] = item;
  });

  // Prepare chart data: count of each status for the month
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

  // Export to CSV
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

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 ml-0 lg:ml-64">
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
          <Heading size="6">📊 Biometric Attendance History</Heading>
          <Button variant="soft" onClick={() => router.push("/dashboard/leave")}>
            ← Back to Dashboard
          </Button>
        </Flex>

        {/* Chart Dashboard */}
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

        {/* Detailed Table */}
        <Card>
          <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
            <Heading size="4">Daily Details</Heading>
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
                  {allDates.map((dateStr) => {
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
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}