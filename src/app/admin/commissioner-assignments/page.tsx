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
  TextField,
} from "@radix-ui/themes";
import { FaSearch, FaTimes } from "react-icons/fa";

type CommissionerOption = {
  _id: string;
  name: string;
  email: string;
};

// Department assignment row
type DepartmentAssignmentRow = {
  departmentId: string;
  departmentName: string;
  commissionerId: string;
  commissionerName: string;
};

// Division assignment row
type DivisionAssignmentRow = {
  divisionId: string;
  divisionName: string;
  divisionHeadId: string;
  divisionHeadName: string;
  commissionerId: string;
  commissionerName: string;
};

export default function CommissionerAssignmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  // Department data
  const [deptRows, setDeptRows] = useState<DepartmentAssignmentRow[]>([]);
  const [commissioners, setCommissioners] = useState<CommissionerOption[]>([]);
  const [selectedCommissionerByDept, setSelectedCommissionerByDept] = useState<
    Record<string, string>
  >({});

  // Department pagination & search
  const [deptSearch, setDeptSearch] = useState("");
  const [deptCurrentPage, setDeptCurrentPage] = useState(1);
  const [deptRowsPerPage, setDeptRowsPerPage] = useState<number | "all">(10);

  // Division data
  const [divRows, setDivRows] = useState<DivisionAssignmentRow[]>([]);
  const [selectedCommissionerByDiv, setSelectedCommissionerByDiv] = useState<
    Record<string, string>
  >({});

  // Division pagination & search
  const [divSearch, setDivSearch] = useState("");
  const [divCurrentPage, setDivCurrentPage] = useState(1);
  const [divRowsPerPage, setDivRowsPerPage] = useState<number | "all">(10);

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // 1. Load department assignments
      const deptRes = await fetch("/api/admin/commissioner-assignments?type=department", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deptRes.status === 401 || deptRes.status === 403) {
        localStorage.clear();
        router.push("/login?expired=true");
        return;
      }
      const deptData = await deptRes.json();
      if (!deptRes.ok) {
        setMessage(deptData?.error || "Failed to load department assignments");
        return;
      }

      setDeptRows(deptData.assignments || []);
      setCommissioners(deptData.commissioners || []);
      setSelectedCommissionerByDept(
        Object.fromEntries(
          (deptData.assignments || []).map((item: DepartmentAssignmentRow) => [
            item.departmentId,
            item.commissionerId || "",
          ])
        )
      );

      // Reset department pagination when data loads
      setDeptCurrentPage(1);

      // 2. Load division assignments
      const divRes = await fetch("/api/admin/commissioner-assignments?type=division", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (divRes.ok) {
        const divData = await divRes.json();
        setDivRows(divData.assignments || []);
        setSelectedCommissionerByDiv(
          Object.fromEntries(
            (divData.assignments || []).map((item: DivisionAssignmentRow) => [
              item.divisionId,
              item.commissionerId || "",
            ])
          )
        );
        setDivCurrentPage(1);
      } else {
        console.warn("Failed to load division assignments");
        setDivRows([]);
      }
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

  // Filter and paginate departments
  const filteredDeptRows = useCallback(() => {
    if (!deptSearch.trim()) return deptRows;
    const searchLower = deptSearch.toLowerCase();
    return deptRows.filter(row =>
      row.departmentName.toLowerCase().includes(searchLower)
    );
  }, [deptRows, deptSearch]);

  const paginatedDeptRows = useCallback(() => {
    const filtered = filteredDeptRows();
    if (deptRowsPerPage === "all") return filtered;
    const start = (deptCurrentPage - 1) * deptRowsPerPage;
    return filtered.slice(start, start + deptRowsPerPage);
  }, [filteredDeptRows, deptRowsPerPage, deptCurrentPage]);

  const totalDeptPages = useCallback(() => {
    const filtered = filteredDeptRows();
    if (deptRowsPerPage === "all") return 1;
    return Math.ceil(filtered.length / deptRowsPerPage);
  }, [filteredDeptRows, deptRowsPerPage]);

  // Filter and paginate divisions
  const filteredDivRows = useCallback(() => {
    if (!divSearch.trim()) return divRows;
    const searchLower = divSearch.toLowerCase();
    return divRows.filter(row =>
      row.divisionName.toLowerCase().includes(searchLower) ||
      row.divisionHeadName.toLowerCase().includes(searchLower)
    );
  }, [divRows, divSearch]);

  const paginatedDivRows = useCallback(() => {
    const filtered = filteredDivRows();
    if (divRowsPerPage === "all") return filtered;
    const start = (divCurrentPage - 1) * divRowsPerPage;
    return filtered.slice(start, start + divRowsPerPage);
  }, [filteredDivRows, divRowsPerPage, divCurrentPage]);

  const totalDivPages = useCallback(() => {
    const filtered = filteredDivRows();
    if (divRowsPerPage === "all") return 1;
    return Math.ceil(filtered.length / divRowsPerPage);
  }, [filteredDivRows, divRowsPerPage]);

  // Handlers for department pagination
  const goToDeptPrevPage = () => {
    if (deptCurrentPage > 1) setDeptCurrentPage(prev => prev - 1);
  };
  const goToDeptNextPage = () => {
    if (deptCurrentPage < totalDeptPages()) setDeptCurrentPage(prev => prev + 1);
  };
  const clearDeptSearch = () => {
    setDeptSearch("");
    setDeptCurrentPage(1);
  };

  // Handlers for division pagination
  const goToDivPrevPage = () => {
    if (divCurrentPage > 1) setDivCurrentPage(prev => prev - 1);
  };
  const goToDivNextPage = () => {
    if (divCurrentPage < totalDivPages()) setDivCurrentPage(prev => prev + 1);
  };
  const clearDivSearch = () => {
    setDivSearch("");
    setDivCurrentPage(1);
  };

  // Save department assignment
  const handleSaveDepartment = async (departmentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const commissionerId = selectedCommissionerByDept[departmentId];
    if (!commissionerId) {
      setMessage("Please select a commissioner");
      return;
    }

    try {
      setSavingId(`dept-${departmentId}`);
      setMessage("");

      const res = await fetch("/api/admin/commissioner-assignments?type=department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departmentId, commissionerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to save department assignment");
        return;
      }

      setMessage("Department assignment saved");
      await loadData();
    } catch (error) {
      console.error("Save department assignment error:", error);
      setMessage("Failed to save department assignment");
    } finally {
      setSavingId("");
    }
  };

  // Delete department assignment
  const handleDeleteDepartment = async (departmentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSavingId(`dept-${departmentId}`);
      setMessage("");

      const res = await fetch("/api/admin/commissioner-assignments?type=department", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departmentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to delete department assignment");
        return;
      }

      setMessage("Department assignment deleted");
      await loadData();
    } catch (error) {
      console.error("Delete department assignment error:", error);
      setMessage("Failed to delete department assignment");
    } finally {
      setSavingId("");
    }
  };

  // Save division assignment
  const handleSaveDivision = async (divisionId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const commissionerId = selectedCommissionerByDiv[divisionId];
    if (!commissionerId) {
      setMessage("Please select a commissioner");
      return;
    }

    try {
      setSavingId(`div-${divisionId}`);
      setMessage("");

      const res = await fetch("/api/admin/commissioner-assignments?type=division", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ divisionId, commissionerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to save division assignment");
        return;
      }

      setMessage("Division assignment saved");
      await loadData();
    } catch (error) {
      console.error("Save division assignment error:", error);
      setMessage("Failed to save division assignment");
    } finally {
      setSavingId("");
    }
  };

  // Delete division assignment
  const handleDeleteDivision = async (divisionId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSavingId(`div-${divisionId}`);
      setMessage("");

      const res = await fetch("/api/admin/commissioner-assignments?type=division", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ divisionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to delete division assignment");
        return;
      }

      setMessage("Division assignment deleted");
      await loadData();
    } catch (error) {
      console.error("Delete division assignment error:", error);
      setMessage("Failed to delete division assignment");
    } finally {
      setSavingId("");
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
              Map each department and division to a commissioner to route leave
              approvals correctly.
            </Text>
          </Box>
        </Flex>

        {/* Departments Table */}
        <Card size="3" mb="5">
          <Heading size="4" mb="3">Departments</Heading>

          {/* Search and pagination controls */}
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Flex gap="2" align="center">
              <Text size="2" color="gray">Show</Text>
              <Select.Root
                value={String(deptRowsPerPage)}
                onValueChange={(value) => {
                  setDeptRowsPerPage(value === "all" ? "all" : Number(value));
                  setDeptCurrentPage(1);
                }}
              >
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
              <TextField.Root
                placeholder="Search department..."
                value={deptSearch}
                onChange={(e) => {
                  setDeptSearch(e.target.value);
                  setDeptCurrentPage(1);
                }}
                className="w-48"
              />
              {deptSearch && (
                <Button variant="soft" onClick={clearDeptSearch}>
                  <FaTimes className="mr-1" /> Clear
                </Button>
              )}
            </Flex>
          </Flex>

          {loading ? (
            <Text color="gray">Loading assignments...</Text>
          ) : filteredDeptRows().length === 0 ? (
            <Text color="gray">No departments found.</Text>
          ) : (
            <>
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
                  {paginatedDeptRows().map((row) => (
                    <Table.Row key={`dept-${row.departmentId}`}>
                      <Table.Cell>{row.departmentName}</Table.Cell>
                      <Table.Cell>
                        {row.commissionerName || "Unassigned"}
                      </Table.Cell>
                      <Table.Cell>
                        <Select.Root
                          value={selectedCommissionerByDept[row.departmentId] || ""}
                          onValueChange={(value) =>
                            setSelectedCommissionerByDept((prev) => ({
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
                        <Flex gap="2">
                          <Button
                            size="1"
                            onClick={() => handleSaveDepartment(row.departmentId)}
                            disabled={savingId === `dept-${row.departmentId}`}
                          >
                            {savingId === `dept-${row.departmentId}`
                              ? "Saving..."
                              : "Save"}
                          </Button>

                          <Button
                            size="1"
                            color="red"
                            variant="soft"
                            onClick={() => handleDeleteDepartment(row.departmentId)}
                            disabled={savingId === `dept-${row.departmentId}`}
                          >
                            Delete
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              {/* Pagination controls */}
              {deptRowsPerPage !== "all" && totalDeptPages() > 1 && (
                <Flex justify="center" gap="2" mt="3">
                  <Button
                    size="1"
                    variant="soft"
                    onClick={goToDeptPrevPage}
                    disabled={deptCurrentPage === 1}
                  >
                    Previous
                  </Button>
                  <Text size="2" color="gray">
                    Page {deptCurrentPage} of {totalDeptPages()}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={goToDeptNextPage}
                    disabled={deptCurrentPage === totalDeptPages()}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </>
          )}
        </Card>

        {/* Divisions Table */}
        <Card size="3">
          <Heading size="4" mb="3">Divisions</Heading>

          {/* Search and pagination controls */}
          <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
            <Flex gap="2" align="center">
              <Text size="2" color="gray">Show</Text>
              <Select.Root
                value={String(divRowsPerPage)}
                onValueChange={(value) => {
                  setDivRowsPerPage(value === "all" ? "all" : Number(value));
                  setDivCurrentPage(1);
                }}
              >
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
              <TextField.Root
                placeholder="Search division or head..."
                value={divSearch}
                onChange={(e) => {
                  setDivSearch(e.target.value);
                  setDivCurrentPage(1);
                }}
                className="w-48"
              />
              {divSearch && (
                <Button variant="soft" onClick={clearDivSearch}>
                  <FaTimes className="mr-1" /> Clear
                </Button>
              )}
            </Flex>
          </Flex>

          {loading ? (
            <Text color="gray">Loading divisions...</Text>
          ) : filteredDivRows().length === 0 ? (
            <Text color="gray">No divisions found.</Text>
          ) : (
            <>
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Division Head</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>
                      Assigned Commissioner
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Assign Commissioner</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {paginatedDivRows().map((row) => (
                    <Table.Row key={`div-${row.divisionId}`}>
                      <Table.Cell>{row.divisionName}</Table.Cell>
                      <Table.Cell>
                        {row.divisionHeadName || "No head assigned"}
                      </Table.Cell>
                      <Table.Cell>
                        {row.commissionerName || "Unassigned"}
                      </Table.Cell>
                      <Table.Cell>
                        <Select.Root
                          value={selectedCommissionerByDiv[row.divisionId] || ""}
                          onValueChange={(value) =>
                            setSelectedCommissionerByDiv((prev) => ({
                              ...prev,
                              [row.divisionId]: value,
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
                        <Flex gap="2">
                          <Button
                            size="1"
                            onClick={() => handleSaveDivision(row.divisionId)}
                            disabled={savingId === `div-${row.divisionId}`}
                          >
                            {savingId === `div-${row.divisionId}`
                              ? "Saving..."
                              : "Save"}
                          </Button>

                          <Button
                            size="1"
                            color="red"
                            variant="soft"
                            onClick={() => handleDeleteDivision(row.divisionId)}
                            disabled={savingId === `div-${row.divisionId}`}
                          >
                            Delete
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              {/* Pagination controls */}
              {divRowsPerPage !== "all" && totalDivPages() > 1 && (
                <Flex justify="center" gap="2" mt="3">
                  <Button
                    size="1"
                    variant="soft"
                    onClick={goToDivPrevPage}
                    disabled={divCurrentPage === 1}
                  >
                    Previous
                  </Button>
                  <Text size="2" color="gray">
                    Page {divCurrentPage} of {totalDivPages()}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={goToDivNextPage}
                    disabled={divCurrentPage === totalDivPages()}
                  >
                    Next
                  </Button>
                </Flex>
              )}
            </>
          )}
        </Card>

        {message && (
          <Text
            size="2"
            mt="3"
            color={
              message.toLowerCase().includes("failed") ? "red" : "green"
            }
          >
            {message}
          </Text>
        )}
      </main>
    </div>
  );
}