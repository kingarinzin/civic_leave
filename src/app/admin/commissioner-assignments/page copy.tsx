"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Table,
  Text,
} from "@radix-ui/themes";

type CommissionerOption = {
  _id: string;
  name: string;
  email: string;
};

type AssignmentRow = {
  departmentId: string;
  departmentName: string;
  commissionerId: string;
  commissionerName: string;
};

export default function CommissionerAssignmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingDepartmentId, setSavingDepartmentId] = useState("");
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [commissioners, setCommissioners] = useState<CommissionerOption[]>([]);
  const [selectedByDepartment, setSelectedByDepartment] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/admin/commissioner-assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        router.push("/login?expired=true");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setCommissioners([]);
        setSelectedByDepartment({});
        setMessage(data?.error || "Failed to load commissioner assignments");
        return;
      }

      const assignments = Array.isArray(data?.assignments)
        ? data.assignments
        : [];
      const commissionerOptions = Array.isArray(data?.commissioners)
        ? data.commissioners
        : [];

      setRows(assignments);
      setCommissioners(commissionerOptions);
      setSelectedByDepartment(
        Object.fromEntries(
          assignments.map((item: AssignmentRow) => [
            item.departmentId,
            item.commissionerId || "",
          ]),
        ),
      );
    } catch (error) {
      console.error("Load commissioner assignments error:", error);
      setMessage("Failed to load commissioner assignments");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (departmentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const commissionerId = selectedByDepartment[departmentId];
    if (!commissionerId) {
      setMessage("Please select a commissioner");
      return;
    }

    try {
      setSavingDepartmentId(departmentId);
      setMessage("");

      const res = await fetch("/api/admin/commissioner-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departmentId, commissionerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to save assignment");
        return;
      }

      setMessage("Assignment saved");
      await loadData();
    } catch (error) {
      console.error("Save commissioner assignment error:", error);
      setMessage("Failed to save assignment");
    } finally {
      setSavingDepartmentId("");
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        <Flex align="center" justify="between" mb="5" wrap="wrap" gap="3">
          <Box>
            <Heading size="6">Commissioner Assignment Policy</Heading>
            <Text size="2" color="gray">
              Map each department to a commissioner to route leave approvals
              correctly.
            </Text>
          </Box>
        </Flex>

        <Card size="3">
          {loading ? (
            <Text color="gray">Loading assignments...</Text>
          ) : rows.length === 0 ? (
            <Text color="gray">No departments found.</Text>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Department</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>
                    Assigned Commissioner
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Reassign To</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rows.map((row) => (
                  <Table.Row key={row.departmentId}>
                    <Table.Cell>{row.departmentName}</Table.Cell>
                    <Table.Cell>
                      {row.commissionerName || "Unassigned"}
                    </Table.Cell>
                    <Table.Cell>
                      <Select.Root
                        value={selectedByDepartment[row.departmentId] || ""}
                        onValueChange={(value) =>
                          setSelectedByDepartment((prev) => ({
                            ...prev,
                            [row.departmentId]: value,
                          }))
                        }
                      >
                        <Select.Trigger placeholder="Select commissioner" />
                        <Select.Content>
                          {commissioners.map((commissioner) => (
                            <Select.Item
                              key={commissioner._id}
                              value={commissioner._id}
                            >
                              {commissioner.name}
                              {commissioner.email
                                ? ` (${commissioner.email})`
                                : ""}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="1"
                        onClick={() => handleSave(row.departmentId)}
                        disabled={savingDepartmentId === row.departmentId}
                      >
                        {savingDepartmentId === row.departmentId
                          ? "Saving..."
                          : "Save"}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>

        {message && (
          <Text
            size="2"
            mt="3"
            color={message.toLowerCase().includes("failed") ? "red" : "green"}
          >
            {message}
          </Text>
        )}
      </main>
    </div>
  );
}
