// app/dashboard/weekly-plan/add/page.tsx
"use client";

import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { FaPlus, FaTrash, FaCopy } from 'react-icons/fa';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';

// ============================================
// TYPES
// ============================================
interface Meeting {
  _id?: string;
  day: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  location: string;
  division: string;
  department: string;
  description: string;
}

// ============================================
// CONSTANTS
// ============================================
const DAYS: string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const DIVISIONS: string[] = [
  'Administration',
  'IT',
  'Finance',
  'HR',
  'Operations',
  'Legal',
  'Communications',
];
const DEPARTMENTS: string[] = [
  '',
  'Accounting',
  'Development',
  'Infrastructure',
  'Support',
  'Strategy',
  'Compliance',
];

const DIVISION_COLORS: Record<string, string> = {
  IT: '#4caf50',
  Finance: '#ff9800',
  HR: '#f44336',
  Administration: '#2196f3',
  Operations: '#9c27b0',
  Legal: '#607d8b',
  Communications: '#00bcd4',
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = (now.getTime() - start.getTime()) / 86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

function getDefaultStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0] || '';
}

function getDefaultEndDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 5);
  const friday = new Date(now.setDate(diff));
  return friday.toISOString().split('T')[0] || '';
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function AddWeeklyPlanPage(): React.ReactElement {
  const router = useRouter();

  const [weekNumber, setWeekNumber] = useState<number>(getCurrentWeekNumber());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [weekLabel, setWeekLabel] = useState<string>('');

  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [planId, setPlanId] = useState<string | null>(null);

  // Auto-generate week label
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startStr = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const endStr = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setWeekLabel(`Week ${weekNumber} (${startStr} - ${endStr})`);
    }
  }, [weekNumber, startDate, endDate]);

  // ============================================
  // MEETING CRUD
  // ============================================
  const addMeeting = (day: string): void => {
    const newMeeting: Meeting = {
      day: day,
      timeStart: '09:00',
      timeEnd: '10:00',
      title: '',
      location: '',
      division: 'Administration',
      department: '',
      description: '',
    };

    setMeetings([...meetings, newMeeting]);

    setTimeout(() => {
      const meetingCards = document.querySelectorAll('.meeting-card');
      const lastCard = meetingCards[meetingCards.length - 1] as HTMLElement;
      if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const titleInput = lastCard.querySelector(
          'input[placeholder="Meeting Title *"]'
        ) as HTMLInputElement;
        if (titleInput) titleInput.focus();
      }
    }, 100);
  };

  const updateMeeting = (index: number, field: keyof Meeting, value: string): void => {
    const updated = [...meetings];
    updated[index] = { ...updated[index], [field]: value };
    setMeetings(updated);
  };

  const deleteMeeting = (index: number): void => {
    if (!window.confirm('Delete this meeting?')) return;
    const updated = meetings.filter((_, i) => i !== index);
    setMeetings(updated);
  };

  const cloneMeeting = (index: number): void => {
    const meeting = meetings[index];
    const cloned: Meeting = { ...meeting, title: meeting.title + ' (Copy)' };
    const updated = [...meetings];
    updated.splice(index + 1, 0, cloned);
    setMeetings(updated);
  };

  const getMeetingsForDay = (day: string): Meeting[] => {
    return meetings
      .filter((m) => m.day === day)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!weekNumber || !year || !startDate || !endDate) {
      setMessage('Please fill in all plan details');
      return;
    }

    if (meetings.length === 0) {
      setMessage('Please add at least one meeting to the week plan');
      return;
    }

    const emptyTitle = meetings.some((m) => !m.title.trim());
    if (emptyTitle) {
      setMessage('All meetings must have a title');
      return;
    }

    const emptyDivision = meetings.some((m) => !m.division);
    if (emptyDivision) {
      setMessage('All meetings must have a division assigned');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const token = localStorage.getItem('token');

      const planData = {
        weekNumber,
        year,
        startDate,
        endDate,
        weekLabel,
        meetings,
      };

      const response = await fetch('/api/weekly-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || 'Failed to create week plan');
        return;
      }

      const newPlanId = data.plan._id;
      const newLink = data.link;

      setPlanId(newPlanId);
      setGeneratedLink(newLink);
      setMessage('✅ Week plan created successfully!');

      setTimeout(() => {
        router.push(`/dashboard/weekly-plan`);
      }, 1500);
    } catch (error) {
      console.error('Submit error:', error);
      setMessage('Failed to create week plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = (): void => {
    if (meetings.length > 0 && !window.confirm('This will clear all meetings. Continue?')) {
      return;
    }
    setWeekNumber(getCurrentWeekNumber());
    setYear(new Date().getFullYear());
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setMeetings([]);
    setMessage('');
    setGeneratedLink('');
    setPlanId(null);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        {/* Header */}
        <Flex align="center" justify="between" mb="5">
          <Box>
            <Heading size="6">Add Weekly Plan</Heading>
            <Text size="2" color="gray">
              Create a new weekly schedule with meetings for each day
            </Text>
          </Box>
          <Button onClick={() => router.push('/dashboard/weekly-plan')} variant="soft">
            View All Plans
          </Button>
        </Flex>

        {/* Main Card */}
        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              {/* Status Badges */}
              <Flex gap="3" align="center" justify="between" wrap="wrap">
                <Badge variant="soft" color="blue">
                  ✏️ Draft Mode
                </Badge>
                {generatedLink && (
                  <Badge variant="solid" color="green">
                    ✅ Plan Created
                  </Badge>
                )}
              </Flex>

              <Separator size="4" />

              {/* Plan Details Grid */}
              <div className="grid md:grid-cols-5 gap-4 items-end">
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Week Number
                  </Text>
                  <TextField.Root
                    type="number"
                    value={weekNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setWeekNumber(Number(e.target.value))
                    }
                    required
                    min={1}
                    max={53}
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    Year
                  </Text>
                  <TextField.Root
                    type="number"
                    value={year}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setYear(Number(e.target.value))
                    }
                    required
                    min={2020}
                    max={2030}
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    Start Date
                  </Text>
                  <TextField.Root
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStartDate(e.target.value)
                    }
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
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEndDate(e.target.value)
                    }
                    required
                    mt="1"
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium">
                    Week Label
                  </Text>
                  <TextField.Root
                    value={weekLabel}
                    readOnly
                    mt="1"
                    style={{ background: '#f3f4f6' }}
                  />
                  <Text size="1" color="gray" mt="1">
                    Auto-generated from dates
                  </Text>
                </Box>
              </div>

              {/* Meetings Section */}
              <Separator size="4" />

              <Flex align="center" justify="between">
                <Box>
                  <Text size="3" weight="bold">
                    📋 Meetings
                  </Text>
                  <Text size="2" color="gray">
                    Total: {meetings.length} meetings
                  </Text>
                </Box>
                <Flex gap="2">
                  <Button
                    type="button"
                    variant="soft"
                    onClick={() => {
                      const daysWithMeetings = new Set(meetings.map((m) => m.day));
                      const targetDay = DAYS.find((d) => !daysWithMeetings.has(d)) || 'Monday';
                      addMeeting(targetDay);
                    }}
                  >
                    <FaPlus /> Add Meeting
                  </Button>
                </Flex>
              </Flex>

              {/* 7-Day Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
                {DAYS.map((day) => {
                  const dayMeetings = getMeetingsForDay(day);
                  return (
                    <div
                      key={day}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50 min-h-[200px]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <Text weight="bold" size="2">
                          {day}
                          <Badge variant="soft" color="gray" ml="2">
                            {dayMeetings.length}
                          </Badge>
                        </Text>
                        <Button
                          type="button"
                          variant="ghost"
                          size="1"
                          onClick={() => addMeeting(day)}
                        >
                          <FaPlus size={12} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {dayMeetings.map((meeting, index) => {
                          const realIndex = meetings.indexOf(meeting);
                          return (
                            <div
                              key={`${day}-${realIndex}`}
                              className="meeting-card bg-white border border-slate-200 rounded-lg p-2 shadow-sm"
                              style={{
                                borderLeft: `4px solid ${
                                  DIVISION_COLORS[meeting.division] || '#888'
                                }`,
                              }}
                            >
                              {/* Time */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={meeting.timeStart}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateMeeting(realIndex, 'timeStart', e.target.value)
                                  }
                                  className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                />
                                <span className="text-xs">-</span>
                                <input
                                  type="time"
                                  value={meeting.timeEnd}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateMeeting(realIndex, 'timeEnd', e.target.value)
                                  }
                                  className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                />
                              </div>

                              {/* Title */}
                              <input
                                value={meeting.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateMeeting(realIndex, 'title', e.target.value)
                                }
                                placeholder="Meeting Title *"
                                className="w-full text-sm font-medium border border-slate-200 rounded px-2 py-0.5 mt-1"
                              />

                              {/* Location */}
                              <input
                                value={meeting.location}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateMeeting(realIndex, 'location', e.target.value)
                                }
                                placeholder="Location (Optional)"
                                className="w-full text-xs border border-slate-200 rounded px-2 py-0.5 mt-1 text-slate-500"
                              />

                              {/* Division */}
                              <select
                                value={meeting.division}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                  updateMeeting(realIndex, 'division', e.target.value)
                                }
                                className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1"
                              >
                                {DIVISIONS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>

                              {/* Department */}
                              <select
                                value={meeting.department}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                  updateMeeting(realIndex, 'department', e.target.value)
                                }
                                className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1 text-slate-500"
                              >
                                {DEPARTMENTS.map((d) => (
                                  <option key={d} value={d}>
                                    {d || 'No Dept'}
                                  </option>
                                ))}
                              </select>

                              {/* Actions */}
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => cloneMeeting(realIndex)}
                                  className="text-slate-400 hover:text-slate-600 text-xs"
                                  title="Clone meeting"
                                >
                                  <FaCopy size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteMeeting(realIndex)}
                                  className="text-red-400 hover:text-red-600 text-xs ml-auto"
                                  title="Delete meeting"
                                >
                                  <FaTrash size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Actions */}
              <Separator size="4" />

              <Flex gap="3" pt="2" wrap="wrap" align="center">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : '📤 Create Week Plan'}
                </Button>
                <Button type="button" variant="soft" color="gray" onClick={handleReset}>
                  Reset
                </Button>
                {generatedLink && (
                  <Box>
                    <Badge color="green" size="2">
                      ✅ Plan Created!
                    </Badge>
                    <Text size="1" color="gray" ml="2">
                      Link: {generatedLink}
                    </Text>
                    <Button
                      type="button"
                      variant="soft"
                      size="1"
                      ml="2"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      Copy Link
                    </Button>
                  </Box>
                )}
              </Flex>

              {message && (
                <Text size="2" color={message.includes('✅') ? 'green' : 'red'}>
                  {message}
                </Text>
              )}
            </Flex>
          </form>
        </Card>

        {/* Email Section (Placeholder) */}
        {planId && generatedLink && (
          <Card
            size="2"
            mt="4"
            style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
          >
            <Flex align="center" justify="between" wrap="wrap" gap="3">
              <Box>
                <Text weight="bold">📧 Email Notification</Text>
                <Text size="2" color="gray">
                  Send this week plan to all staff members
                </Text>
              </Box>
              <Button
                onClick={() => {
                  const sendEmail = async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch('/api/weekly-plans/send', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ planId }),
                      });

                      if (res.ok) {
                        alert('✅ Email notification sent! (PLACEHOLDER)');
                      } else {
                        alert('❌ Failed to send email');
                      }
                    } catch (error) {
                      alert('❌ Failed to send email');
                    }
                  };
                  sendEmail();
                }}
                style={{ background: '#1976d2', color: 'white' }}
              >
                📧 Send to Staff
              </Button>
            </Flex>
          </Card>
        )}
      </main>
    </div>
  );
}