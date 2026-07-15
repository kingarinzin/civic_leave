// app/dashboard/weekly-plan/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Table,
} from '@radix-ui/themes';
import { FaPlus, FaEdit, FaEye, FaCopy, FaTrash } from 'react-icons/fa';

// ============================================
// TYPES
// ============================================
interface WeekPlan {
  _id: string;
  weekNumber: number;
  year: number;
  weekLabel: string;
  status: 'draft' | 'sent' | 'updated';
  version: number;
  meetings: unknown[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// COMPONENT
// ============================================
export default function WeeklyPlansList(): React.ReactElement {
  const router = useRouter();
  const [plans, setPlans] = useState<WeekPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/weekly-plans', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: WeekPlan[] = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'orange' | 'gray' => {
    switch (status) {
      case 'sent':
        return 'green';
      case 'updated':
        return 'orange';
      case 'draft':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'sent':
        return '✅ Sent';
      case 'updated':
        return '🔄 Updated';
      case 'draft':
        return '✏️ Draft';
      default:
        return status;
    }
  };

  const handleDelete = async (id: string, label: string): Promise<void> => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      setDeleting(id);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchPlans();
      } else {
        alert('Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan');
    } finally {
      setDeleting(null);
    }
  };

  const handleSendEmail = async (id: string): Promise<void> => {
    try {
      setSendingEmail(id);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/weekly-plans/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: id }),
      });

      if (res.ok) {
        alert('✅ Email notification sent! (PLACEHOLDER - Email implementation pending)');
        await fetchPlans();
      } else {
        alert('❌ Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 flex items-center justify-center">
          <Text>Loading weekly plans...</Text>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        {/* Header */}
        <Flex align="center" justify="between" mb="5">
          <Box>
            <Heading size="6">Weekly Plans</Heading>
            <Text size="2" color="gray">
              Manage all weekly schedules
            </Text>
          </Box>
          <Button onClick={() => router.push('/dashboard/weekly-plan/add')}>
            <FaPlus /> Create New Plan
          </Button>
        </Flex>

        {/* Plans Table */}
        <Card size="3">
          {plans.length === 0 ? (
            <Flex direction="column" align="center" gap="3" py="6">
              <Text size="3" color="gray">
                No weekly plans created yet
              </Text>
              <Button onClick={() => router.push('/dashboard/weekly-plan/add')}>
                <FaPlus /> Create Your First Plan
              </Button>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Week</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Label</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Meetings</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Version</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Updated</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {plans.map((plan) => (
                  <Table.Row key={plan._id}>
                    <Table.RowHeaderCell>
                      Week {plan.weekNumber} ({plan.year})
                    </Table.RowHeaderCell>
                    <Table.Cell>{plan.weekLabel}</Table.Cell>
                    <Table.Cell>{plan.meetings.length}</Table.Cell>
                    <Table.Cell>v{plan.version}</Table.Cell>
                    <Table.Cell>
                      <Badge color={getStatusColor(plan.status)}>
                        {getStatusLabel(plan.status)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(plan.updatedAt).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2" wrap="wrap">
                        {/* EDIT BUTTON - Navigates to Admin Edit View */}
                        <Button
                          size="1"
                          variant="soft"
                          onClick={() => router.push(`/dashboard/weekly-plan/${plan._id}`)}
                          title="Edit plan"
                        >
                          <FaEdit />
                        </Button>

                        {/* VIEW PUBLIC BUTTON */}
                        <Button
                          size="1"
                          variant="soft"
                          onClick={() => router.push(`/weekly-plan/${plan._id}`)}
                          title="View public link"
                        >
                          <FaEye />
                        </Button>

                        {/* COPY LINK BUTTON */}
                        <Button
                          size="1"
                          variant="soft"
                          onClick={() => {
                            const link = `${window.location.origin}/weekly-plan/${plan._id}`;
                            navigator.clipboard.writeText(link);
                            alert('Link copied to clipboard!');
                          }}
                          title="Copy public link"
                        >
                          <FaCopy />
                        </Button>

                        {/* SEND EMAIL BUTTON */}
                        <Button
                          size="1"
                          variant="soft"
                          color="green"
                          onClick={() => handleSendEmail(plan._id)}
                          disabled={sendingEmail === plan._id}
                          title="Send email notification"
                        >
                          {sendingEmail === plan._id ? '...' : '📧'}
                        </Button>

                        {/* DELETE BUTTON */}
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          onClick={() => handleDelete(plan._id, plan.weekLabel)}
                          disabled={deleting === plan._id}
                          title="Delete plan"
                        >
                          <FaTrash />
                        </Button>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>
      </main>
    </div>
  );
}