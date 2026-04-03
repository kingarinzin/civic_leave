"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {Badge,Box,Button,Card,Flex,Heading,Table,Text,TextArea,} from "@radix-ui/themes";

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
};

export default function LeaveApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [applications, setApplications] = useState<ApprovalApplication[]>([]);
  const [remarksById, setRemarksById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

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

      if (res.status === 401) {
        localStorage.clear();
        router.push("/login?expired=true");
        return;
      }

      const data = await res.json();
      setApplications(
        Array.isArray(data?.applications) ? data.applications : [],
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
    action: "approve" | "reject",
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

      setMessage(data?.message || "Request updated");
      setApplications((prev) =>
        prev.filter((item) => item._id !== applicationId),
      );
    } catch (error) {
      console.error("Leave approval action error:", error);
      setMessage("Failed to process leave request");
    } finally {
      setProcessingId("");
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        <Flex align="center" justify="between" mb="5" wrap="wrap" gap="3">
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

        <Card size="3">
          {loading ? (
            <Text color="gray">Loading approvals...</Text>
          ) : applications.length === 0 ? (
            <Text color="gray">No pending leave requests in your queue.</Text>
          ) : (
            <div className="overflow-x-auto">
              <Table.Root variant="surface" style={{ minWidth: 1550 }}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Applicant</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Department</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Division</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Leave Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Start Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>End Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>No. of Days</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell style={{ minWidth: 260 }}>
                      Description
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell style={{ minWidth: 240 }}>
                      Remarks
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell style={{ minWidth: 170 }}>
                      Action
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {applications.map((item) => (
                    <Table.Row key={item._id}>
                      <Table.Cell className="py-3 align-top">
                        <Text weight="medium">{item.userName || "-"}</Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Badge variant="soft" color="gray">
                          {item.applicantRole || "Officer"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>{item.departmentName || "-"}</Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>{item.divisionName || "-"}</Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>{item.leaveTypeName || "-"}</Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>
                          {new Date(item.fromDate).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>
                          {new Date(item.toDate).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text>{item.days} day(s)</Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Text size="2" color="gray">
                          {item.description || "No description"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <TextArea
                          value={remarksById[item._id] || ""}
                          onChange={(e) =>
                            setRemarksById((prev) => ({
                              ...prev,
                              [item._id]: e.target.value,
                            }))
                          }
                          placeholder="Optional remarks"
                          size="1"
                        />
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Badge color="amber" variant="soft">
                          Pending
                        </Badge>
                      </Table.Cell>
                      <Table.Cell className="py-3 align-top">
                        <Flex gap="2" wrap="wrap">
                          <Button
                            size="1"
                            onClick={() => handleAction(item._id, "approve")}
                            disabled={processingId === item._id}
                          >
                            Approve
                          </Button>
                          <Button
                            size="1"
                            color="red"
                            variant="soft"
                            onClick={() => handleAction(item._id, "reject")}
                            disabled={processingId === item._id}
                          >
                            Reject
                          </Button>
                        </Flex>
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
