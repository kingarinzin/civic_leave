"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {Badge,Box,Button,Card,Flex,Heading,Select,Table,Text,TextField,} from "@radix-ui/themes";

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
  attachment?: string;
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
            ].includes(role),
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

        setApplications(
          Array.isArray(applicationsData?.applications)
            ? applicationsData.applications
            : [],
        );

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

  const leaveAvailabilityRows = useMemo(() => {
    return [...leaveEntries]
      .filter((entry) => !!entry.leaveTypeName)
      .sort((a, b) => a.leaveTypeName.localeCompare(b.leaveTypeName));
  }, [leaveEntries]);

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
      <main className="flex-1 p-6 ml-64">
        {/* HEADER */}
        <Flex align="center" justify="between" mb="5" wrap="wrap" gap="3">
          <Box>
            <Heading size="6">Leave Section</Heading>
            <Text size="2" color="gray">
              Track balance and leave status.
            </Text>
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

        {/* LEAVE BALANCE */}
        <Card size="3" mb="4">
          <Heading size="4" mb="3">
            Leave Availability
          </Heading>

          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {leaveAvailabilityRows.length > 0 ? (
                leaveAvailabilityRows.map((row, index) => (
                  <Table.Row key={index}>
                    <Table.RowHeaderCell>
                      {row.leaveTypeName}
                    </Table.RowHeaderCell>
                    <Table.Cell>{row.balance}</Table.Cell>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Cell colSpan={2}>
                    <Text size="2" color="gray">
                      No leave types configured yet
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Card>

        {/* APPLICATIONS TABLE */}
        <Card size="3">
          <Flex align="center" justify="between" mb="4" wrap="wrap" gap="3">
            <Heading size="4">{visibilityLabel}</Heading>

            <Text size="2" color="gray">
              You are seeing leave records within your allowed scope.
            </Text>
          </Flex>

          {/* CONTROLS */}
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

            <Box style={{ minWidth: 220 }}>
              <TextField.Root
                placeholder="Search by type, date, status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
          </Flex>

          {/* TABLE */}
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Sl.No</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Applicant</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>End Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>No. of Days</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Attachmenttttt</Table.ColumnHeaderCell>
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

                    <Table.Cell>
                      {row.attachment ? (
                        <a
                          href={row.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "blue",
                            textDecoration: "underline",
                          }}
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </Table.Cell>

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