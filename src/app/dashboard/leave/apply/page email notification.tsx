"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {Badge,Box,Button,Card,Checkbox,Flex,Heading,Separator,Text,TextArea,TextField,} from "@radix-ui/themes";

type LeaveType = {
  _id: string;
  name: string;
};

type LeaveEntry = {
  leaveTypeId: string;
  leaveTypeName: string;
  balance: number;
};

function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const minSelectableDate = getTodayLocalDateString();

  const [isHalfDay, setIsHalfDay] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [days, setDays] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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

        const [typesRes, balanceRes] = await Promise.all([
          fetch("/api/leave-types"),
          fetch(`/api/leave-balances?userId=${profile?._id}`),
        ]);

        const typesData = await typesRes.json();
        const balanceData = await balanceRes.json();

        setLeaveTypes(Array.isArray(typesData) ? typesData : []);
        setLeaveEntries(
          Array.isArray(balanceData?.leaves) ? balanceData.leaves : [],
        );
      } catch (error) {
        console.error("Apply leave data load error:", error);
        setMessage("Failed to load leave form data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const selectedBalance = useMemo(() => {
    const selected = leaveEntries.find(
      (entry) => entry.leaveTypeId?.toString() === leaveTypeId,
    );
    return Number(selected?.balance || 0);
  }, [leaveEntries, leaveTypeId]);

  useEffect(() => {
    if (isHalfDay) {
      setDays("0.5");
      return;
    }

    if (!fromDate || !toDate) {
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      setDays("");
      return;
    }

    const diffTime = end.getTime() - start.getTime();
    const computedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setDays(String(computedDays));
  }, [isHalfDay, fromDate, toDate]);

  const handleReset = () => {
    setIsHalfDay(false);
    setLeaveTypeId("");
    setFromDate("");
    setToDate("");
    setDays("");
    setDescription("");
    setAttachmentName("");
    setMessage("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsedDays = Number(days);

    if (!leaveTypeId || !fromDate || !toDate || !parsedDays) {
      setMessage("Please fill all required fields");
      return;
    }

    if (fromDate < minSelectableDate || toDate < minSelectableDate) {
      setMessage(
        "Past dates are not allowed. Please select today or future dates",
      );
      return;
    }

    if (parsedDays > selectedBalance) {
      setMessage("No. of days cannot exceed assigned leave balance");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const res = await fetch("/api/apply-leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isHalfDay,
          leaveTypeId,
          fromDate,
          toDate,
          days: parsedDays,
          description,
          attachmentName,
        }),
      });

      const data = await res.json();


      

      if (!res.ok) {
        setMessage(data?.error || "Failed to apply leave");
        return;
      }

      router.push("/dashboard/leave");
    } catch (error) {
      console.error("Apply leave submit error:", error);
      setMessage("Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Text color="gray">Loading leave form...</Text>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        <Flex align="center" justify="between" mb="5">
          <Box>
            <Heading size="6">Apply Leave</Heading>
            <Text size="2" color="gray">
              Approval is auto-routed using department/division hierarchy.
            </Text>
          </Box>
          <Button
            onClick={() => router.push("/dashboard/leave")}
            variant="soft"
          >
            Leave Details
          </Button>
        </Flex>

        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Flex wrap="wrap" gap="3" align="center" justify="between">
                <Flex gap="2" align="center">
                  <Checkbox
                    checked={isHalfDay}
                    onCheckedChange={(checked) =>
                      setIsHalfDay(checked === true)
                    }
                  />
                  <Text size="2">Half-day leave</Text>
                </Flex>
                <Badge variant="soft" color="blue">
                  Hierarchy approval enabled
                </Badge>
              </Flex>

              <Separator size="4" />

              <div className="grid md:grid-cols-4 gap-4 items-end">
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Leave Type
                  </Text>
                  <select
                    className="w-full border border-slate-300 bg-white rounded-md px-3 py-2 mt-1"
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    Start Date
                  </Text>
                  <TextField.Root
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    min={minSelectableDate}
                    required
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    End Date
                  </Text>
                  <TextField.Root
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate || minSelectableDate}
                    required
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    No. of Days
                  </Text>
                  <TextField.Root
                    type="number"
                    step={isHalfDay ? "0.5" : "1"}
                    min={isHalfDay ? "0.5" : "1"}
                    max={selectedBalance || undefined}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    required
                    mt="1"
                  />
                  <Text size="1" color="gray" mt="1">
                    Available balance: {selectedBalance}
                  </Text>
                </Box>
              </div>

              <Box>
                <Text as="label" size="2" weight="medium">
                  Attachment (optional)
                </Text>
                <input
                  type="file"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 mt-1 bg-white"
                  onChange={(e) =>
                    setAttachmentName(e.target.files?.[0]?.name || "")
                  }
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium">
                  Description
                </Text>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter leave description"
                  style={{ minHeight: 120 }}
                  mt="1"
                />
              </Box>

              <Flex gap="3" pt="2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </Flex>
              {message && (
                <Text size="2" color="red">
                  {message}
                </Text>
              )}
            </Flex>
          </form>
        </Card>
      </main>
    </div>
  );
}
