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
  TextArea,
} from "@radix-ui/themes";

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
};

export default function LeaveApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [applications, setApplications] = useState<ApprovalApplication[]>([]);
  const [remarksById, setRemarksById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
  "all" | "pending" | "approved" | "rejected"
  >("all");
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
       console.log("LOADED DATA:", data);

      if (res.status === 401) {
        localStorage.clear();
        router.push("/login?expired=true");
        return;
      }

      //const data = await res.json();
      setApplications(
        Array.isArray(data?.applications) ? data.applications : []
      );
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

  const handleAction = async (
    applicationId: string,
    action: "approve" | "reject"
  ) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setProcessingId(applicationId);
    setMessage("");

    try {
      const res = await fetch("/api/leave-approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId,
          action,
          remarks: remarksById[applicationId] || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.error || "Failed to process request");
        return;
      }

      setApplications((prev) =>
        prev.map((item) =>
          item._id === applicationId
            ? {
                ...item,
                status: action === "approve" ? "approved" : "rejected",
              }
            : item
        )
      );

      setMessage(data?.message || "Request updated");
    } catch (error) {
      console.error("Leave approval action error:", error);
      setMessage("Failed to process leave request");
    } finally {
      setProcessingId("");
    }
  };

  const filteredApplications =
  activeTab === "all"
    ? applications
    : applications.filter((item) => item.status === activeTab);


      const counts = {
        all: applications.length,
        pending: applications.filter((a) => a.status === "pending").length,
        approved: applications.filter((a) => a.status === "approved").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
      };
  return (
    <div className="flex flex-col lg:flex-row bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:ml-64 w-full">
        <Flex
          direction={{ initial: "column", sm: "row" }}
          align="center"
          justify="between"
          mb="5"
          gap="3"
        >
          <Box>
            <Heading size="6">Leave Approvals</Heading>
            <Text size="2" color="gray">
              Approve or reject leave requests from your hierarchy.
            </Text>
          </Box>

          <Button
            variant="soft"
            onClick={() => router.push("/dashboard/leave")}
          >
            Leave Dashboard
          </Button>
        </Flex>

        {/* Tabs */}
        <Flex gap="2" mb="4" wrap="wrap">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
              <Button
                key={tab}
                size="2"
                variant={activeTab === tab ? "solid" : "soft"}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()} ({counts[tab]})
              </Button>
            ))}
        </Flex>

        <Card size="3">
          {loading ? (
            <Text color="gray">Loading approvals...</Text>
          ) : filteredApplications.length === 0 ? (
            <Text color="gray">No records found.</Text>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table.Root
                variant="surface"
                style={{ minWidth: "1000px", width: "100%" }}
              >
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Applicant</Table.ColumnHeaderCell>
                   {/* <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell> */}
                   {/* <Table.ColumnHeaderCell>Department</Table.ColumnHeaderCell> */}
                   {/* <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell> */}
                    <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>End Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                   {/* <Table.ColumnHeaderCell>Remarks</Table.ColumnHeaderCell> */}
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Approved Info</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {filteredApplications.map((item) => (
                    <Table.Row
                      key={item._id}
                      className={
                        item.status !== "pending"
                          ? "opacity-50 transition"
                          : ""
                      }
                    >
                      <Table.Cell>{item.userName}</Table.Cell>
                      {/*<Table.Cell><Badge variant="soft">{item.applicantRole}</Badge></Table.Cell> */}
                     {/* <Table.Cell>{item.departmentName}</Table.Cell> */}
                     {/*<Table.Cell>{item.divisionName}</Table.Cell> */}
                      <Table.Cell>{item.leaveTypeName}</Table.Cell>
                      <Table.Cell>
                        {new Date(item.fromDate).toLocaleDateString()}
                      </Table.Cell>
                      <Table.Cell>
                        {new Date(item.toDate).toLocaleDateString()}
                      </Table.Cell>
                      <Table.Cell>{item.days} day(s)</Table.Cell>
                      <Table.Cell>{item.description}</Table.Cell>

                     {/* <Table.Cell>
                        <TextArea
                          value={remarksById[item._id] || ""}
                          disabled={item.status !== "pending"}
                          onChange={(e) =>
                            setRemarksById((prev) => ({
                              ...prev,
                              [item._id]: e.target.value,
                            }))
                          }
                        />
                      </Table.Cell> */}

                      <Table.Cell>
                        {item.status === "pending" && (
                          <Badge color="amber">Pending</Badge>
                        )}
                        {item.status === "approved" && (
                          <Badge color="green">Approved</Badge>
                        )}
                        {item.status === "rejected" && (
                          <Badge color="red">Rejected</Badge>
                        )}
                      </Table.Cell>

                      <Table.Cell>
                        {item.status !== "pending" ? (
                          <>
                            <Text size="2" weight="medium">
                              {item.approvedBy || "—"}
                            </Text>
                            <Text size="1" color="gray">
                              {item.approvedAt
                                ? new Date(item.approvedAt).toLocaleString()
                                : ""}
                            </Text>
                          </>
                        ) : (
                          <Text size="1" color="gray">
                            —
                          </Text>
                        )}
                      </Table.Cell>

                      <Table.Cell>
                        <Select.Root
                          value={item.status}
                          disabled={
                            item.status !== "pending" ||
                            processingId === item._id
                          }
                          onValueChange={(value) => {
                            if (item.status !== "pending") return;

                            const confirmed = confirm(
                              `Are you sure you want to mark this request as ${value}?`
                            );

                            if (!confirmed) return;

                            handleAction(
                              item._id,
                              value === "approved" ? "approve" : "reject"
                            );
                          }}
                        >
                          <Select.Trigger placeholder="Select action" />

                          <Select.Content>
                            <Select.Item value="approved">
                              Approve
                            </Select.Item>
                            <Select.Item value="rejected">
                              Reject
                            </Select.Item>
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

        {message && (
          <Text
            size="2"
            color={message.toLowerCase().includes("failed") ? "red" : "green"}
            mt="3"
          >
            {message}
          </Text>
        )}
      </main>
    </div>
  );
}