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
  Select,
} from "@radix-ui/themes";

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

  // Generate all days of the month (to fill missing dates)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split("T")[0];
  });

  // Map attendance data by date for quick lookup
  const attendanceByDate = {};
  attendance.forEach((item) => {
    const dateObj = new Date(item.date);
    const key = dateObj.toISOString().split("T")[0];
    attendanceByDate[key] = item;
  });

  const monthName = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 ml-0 lg:ml-64">
        <Flex justify="between" align="center" mb="4">
          <Heading size="5">Biometric Attendance History</Heading>
          <Button variant="soft" onClick={() => router.push("/dashboard/leave")}>
            ← Back to Dashboard
          </Button>
        </Flex>

        <Card>
          <Flex justify="between" align="center" mb="4" wrap="wrap" gap="2">
            <Flex gap="2" align="center">
              <Button variant="soft" onClick={prevMonth}>← Prev</Button>
              <Text weight="bold" size="4">{monthName}</Text>
              <Button variant="soft" onClick={nextMonth}>Next →</Button>
            </Flex>
          </Flex>

          {loading && <Text>Loading attendance...</Text>}
          {error && <Text color="red">{error}</Text>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
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
                    return (
                      <Table.Row key={dateStr}>
                        <Table.RowHeaderCell>{displayDate}</Table.RowHeaderCell>
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
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                            {day?.status || "No punch"}
                          </span>
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