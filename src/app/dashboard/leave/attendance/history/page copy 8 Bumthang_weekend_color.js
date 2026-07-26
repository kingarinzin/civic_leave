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
  Select,
} from "@radix-ui/themes";
import { FaDownload, FaCalendarAlt, FaClock } from "react-icons/fa";

// Helper to format date as YYYY-MM-DD in local time
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: calculate total working hours from firstIn and lastOut times
function calculateTotalHours(firstIn, lastOut) {
  if (!firstIn || !lastOut) return 0; // return number for summation
  
  const parseTime = (timeStr) => {
    timeStr = timeStr.trim().toUpperCase();
    const hasAmPm = timeStr.includes('AM') || timeStr.includes('PM');
    let hours = 0, minutes = 0;
    if (hasAmPm) {
      const parts = timeStr.split(' ');
      const timePart = parts[0];
      const ampm = parts[1];
      let [h, m] = timePart.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = h;
      minutes = m;
    } else {
      const [h, m] = timeStr.split(':').map(Number);
      hours = h;
      minutes = m;
    }
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  try {
    const start = parseTime(firstIn);
    const end = parseTime(lastOut);
    if (end < start) return 0;
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return parseFloat(hours.toFixed(1)); // return decimal hours
  } catch (e) {
    return 0;
  }
}

// Format hours for display (e.g., "8.5h")
const formatHours = (hours) => {
  if (hours === 0) return "0h";
  const whole = Math.floor(hours);
  const fraction = hours - whole;
  if (fraction === 0) return `${whole}h`;
  const minutes = Math.round(fraction * 60);
  return `${whole}h ${minutes}m`;
};

export default function AttendanceHistoryPage() {
  const router = useRouter();
  
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetEmpCode, setTargetEmpCode] = useState(null);
  const [paramsReady, setParamsReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTargetUserId(params.get("userId"));
    setTargetEmpCode(params.get("empCode"));
    setParamsReady(true);
  }, []);

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
      const startStr = formatLocalDate(startDate);
      const endStr = formatLocalDate(endDate);
      const token = localStorage.getItem("token");

      let url = `/api/attendance?startDate=${startStr}&endDate=${endStr}`;
      if (targetEmpCode) {
        url += `&empCode=${targetEmpCode}`;
      } else if (targetUserId) {
        url += `&userId=${targetUserId}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();

      if (data.userName) setViewingUserName(data.userName);
      else if (targetUserId) setViewingUserName("this officer");
      else setViewingUserName("");

      setAttendance(data.attendance || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramsReady) {
      fetchAttendance();
    }
  }, [year, month, targetUserId, targetEmpCode, paramsReady]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToCurrentMonth = () => setCurrentDate(new Date());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return formatLocalDate(d);
  });

  const attendanceByDate = {};
  attendance.forEach((item) => {
    const dateObj = new Date(item.date);
    const key = formatLocalDate(dateObj);
    attendanceByDate[key] = item;
  });

  // Compute monthly statistics
  let totalWorkingHours = 0;
  let totalDaysWorked = 0;
  let totalAbsent = 0;
  let totalLate = 0;

  allDates.forEach(dateStr => {
    const day = attendanceByDate[dateStr];
    if (!day || day.status === "No punch") {
      totalAbsent++;
    } else {
      const hours = calculateTotalHours(day.firstIn, day.lastOut);
      if (hours > 0) {
        totalWorkingHours += hours;
        totalDaysWorked++;
      }
      if (day.status === "Late arrival" || day.status === "Late & Early") totalLate++;
    }
  });

  const averageDailyHours = totalDaysWorked > 0 ? totalWorkingHours / totalDaysWorked : 0;
  const totalWorkingHoursFormatted = formatHours(totalWorkingHours);
  const averageDailyHoursFormatted = formatHours(averageDailyHours);

  // Gauge: percentage of a 160h full-time month (8h/day * 20 working days approx)
  const fullTimeTarget = 160; // standard monthly hours
  const percentageOfTarget = Math.min(100, (totalWorkingHours / fullTimeTarget) * 100);
  const gaugeColor = percentageOfTarget >= 90 ? "#22c55e" : percentageOfTarget >= 70 ? "#f97316" : "#ef4444";

  const monthName = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const exportToCSV = () => {
    const headers = ["Date", "Day", "First In", "Last Out", "Total Hrs", "Status"];
    const rows = allDates.map(dateStr => {
      const day = attendanceByDate[dateStr];
      const [y, m, d] = dateStr.split("-");
      const displayDate = new Date(Date.UTC(y, m-1, d)).toLocaleDateString("en-GB");
      const weekday = getWeekday(dateStr);
      const totalHrs = formatHours(calculateTotalHours(day?.firstIn, day?.lastOut));
      return [
        displayDate,
        weekday,
        day?.firstIn || "-",
        day?.lastOut || "-",
        totalHrs,
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
    const [y, m, d] = dateStr.split("-");
    const date = new Date(Date.UTC(y, m-1, d));
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

        {/* Monthly Summary Card with Circular Gauge */}
        <Card mb="4">
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Heading size="4">Monthly Summary – {monthName}</Heading>
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

          {loading && <Text>Loading monthly data...</Text>}
          {error && <Text color="red">{error}</Text>}
          {!loading && !error && (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              {/* Circular Gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="10"
                      strokeDasharray={`${(percentageOfTarget / 100) * 283} 283`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="45" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1f2937">
                      {Math.round(percentageOfTarget)}%
                    </text>
                    <text x="50" y="62" textAnchor="middle" fontSize="9" fill="#6b7280">
                      of target
                    </text>
                  </svg>
                </div>
                <div className="mt-2 text-center">
                  <Text size="2" color="gray">Total Working Hours</Text>
                  <Text size="6" weight="bold" className="text-blue-700">{totalWorkingHoursFormatted}</Text>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center shadow-sm">
                  <Text size="2" color="gray">Days Worked</Text>
                  <Text size="5" weight="bold" className="text-green-700">{totalDaysWorked}</Text>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center shadow-sm">
                  <Text size="2" color="gray">Late Arrivals</Text>
                  <Text size="5" weight="bold" className="text-orange-700">{totalLate}</Text>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center shadow-sm">
                  <Text size="2" color="gray">Absent Days</Text>
                  <Text size="5" weight="bold" className="text-red-700">{totalAbsent}</Text>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center shadow-sm">
                  <Text size="2" color="gray">Avg Daily Hours</Text>
                  <Text size="5" weight="bold" className="text-blue-700">{averageDailyHoursFormatted}</Text>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Daily Details Table (unchanged except added Total Hrs column) */}
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
                    <Table.ColumnHeaderCell>Total Hrs</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredDates.map((dateStr) => {
                    const day = attendanceByDate[dateStr];
                    const [y, m, d] = dateStr.split("-");
                    const displayDate = new Date(Date.UTC(y, m-1, d)).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const weekday = getWeekday(dateStr);
                    const isWeekend = weekday === "Sat" || weekday === "Sun";
                    const totalHrs = formatHours(calculateTotalHours(day?.firstIn, day?.lastOut));
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
                          <span className="font-medium text-blue-700">{totalHrs}</span>
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
                      <Table.Cell colSpan={6} align="center">
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