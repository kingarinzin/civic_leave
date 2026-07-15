"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { FaArrowLeft, FaEdit, FaSave, FaTrash, FaCopy, FaPlus } from 'react-icons/fa';

// ============================================
// TYPES
// ============================================
interface Meeting {
  _id: string;
  day: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  location: string;
  division: string;
  department: string;
  description: string;
}

interface WeekPlan {
  _id: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  weekLabel: string;
  meetings: Meeting[];
  status: 'draft' | 'sent' | 'updated';
  version: number;
  updatedAt: string;
}

const DAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DIVISIONS: string[] = ['Administration', 'IT', 'Finance', 'HR', 'Operations', 'Legal', 'Communications'];
const DEPARTMENTS: string[] = ['', 'Accounting', 'Development', 'Infrastructure', 'Support', 'Strategy', 'Compliance'];

// ✅ Location Options
const LOCATION_OPTIONS = [
  'Druk Dradhir Khang1',
  'Druk Dradhir Khang2',
  'Druk Dradhir Khang3',
  'Druk Dradhir Khang4',
  'Others',
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
// COMPONENT
// ============================================
export default function AdminWeeklyPlanView(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isAddingMeeting, setIsAddingMeeting] = useState<string | null>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState<string | null>(null);

  // Track custom location text for meetings that have "Others" selected
  const [customLocation, setCustomLocation] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlan();
  }, [id]);

  const fetchPlan = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: WeekPlan = await res.json();
        setPlan(data);
        // Initialize custom location map for meetings with non‑standard locations
        const customMap: Record<string, string> = {};
        data.meetings.forEach((m) => {
          if (m.location && !LOCATION_OPTIONS.includes(m.location)) {
            customMap[m._id] = m.location;
          }
        });
        setCustomLocation(customMap);
      } else {
        setMessage('❌ Plan not found');
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      setMessage('❌ Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!plan) return;

    try {
      setSaving(true);
      setMessage('');
      const token = localStorage.getItem('token');

      // Build meetings with custom locations applied
      const meetingsWithLocations = plan.meetings.map((meeting) => {
        // If this meeting has a custom location in the map, use it
        if (customLocation[meeting._id] !== undefined) {
          return { ...meeting, location: customLocation[meeting._id] };
        }
        return meeting;
      });

      const res = await fetch(`/api/weekly-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekNumber: plan.weekNumber,
          year: plan.year,
          startDate: plan.startDate,
          endDate: plan.endDate,
          weekLabel: plan.weekLabel,
          meetings: meetingsWithLocations,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage('✅ Plan updated successfully!');
        setIsEditing(false);
        setPlan(result.plan);
        // Reset custom location map after save
        const customMap: Record<string, string> = {};
        result.plan.meetings.forEach((m: Meeting) => {
          if (m.location && !LOCATION_OPTIONS.includes(m.location)) {
            customMap[m._id] = m.location;
          }
        });
        setCustomLocation(customMap);
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to update plan: ${error}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('❌ Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete "${plan?.weekLabel}"? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        router.push('/dashboard/weekly-plan');
      } else {
        setMessage('❌ Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('❌ Failed to delete plan');
    }
  };

  // Update meeting by _id
  const updateMeeting = (meetingId: string, field: keyof Meeting, value: string): void => {
    if (!plan) return;
    const updatedMeetings = plan.meetings.map((meeting) => {
      if (meeting._id === meetingId) {
        return { ...meeting, [field]: value };
      }
      return meeting;
    });
    setPlan({ ...plan, meetings: updatedMeetings });
  };

  // =========================================================
  // ✅ LOCATION HANDLERS (FIXED)
  // =========================================================

  // Get the value to display in the dropdown
  const getLocationDisplay = (meeting: Meeting): string => {
    // If the meeting has an entry in the customLocation map, we consider it "Others"
    if (customLocation[meeting._id] !== undefined) {
      return 'Others';
    }
    // If location is a predefined option, return it
    if (meeting.location && LOCATION_OPTIONS.includes(meeting.location)) {
      return meeting.location;
    }
    // Otherwise no location selected
    return '';
  };

  // Handle dropdown change
  const handleLocationChange = (meetingId: string, value: string): void => {
    if (!plan) return;

    if (value === 'Others') {
      // When 'Others' is selected, keep existing custom text if any, or empty
      const existingCustom = customLocation[meetingId] || '';
      setCustomLocation((prev) => ({ ...prev, [meetingId]: existingCustom }));
      // Clear the location field (will be replaced by custom text on save)
      const updatedMeetings = plan.meetings.map((meeting) => {
        if (meeting._id === meetingId) {
          return { ...meeting, location: '' };
        }
        return meeting;
      });
      setPlan({ ...plan, meetings: updatedMeetings });
    } else {
      // Predefined location selected
      const updatedMeetings = plan.meetings.map((meeting) => {
        if (meeting._id === meetingId) {
          return { ...meeting, location: value };
        }
        return meeting;
      });
      setPlan({ ...plan, meetings: updatedMeetings });
      // Remove from custom location map
      const newCustom = { ...customLocation };
      delete newCustom[meetingId];
      setCustomLocation(newCustom);
    }
  };

  // Handle custom location text input change
  const handleCustomLocationChange = (meetingId: string, value: string): void => {
    setCustomLocation((prev) => ({ ...prev, [meetingId]: value }));
  };

  // Add meeting
  const addMeeting = async (day: string): Promise<void> => {
    if (!plan) return;

    const newMeeting: Omit<Meeting, '_id'> = {
      day,
      timeStart: '09:00',
      timeEnd: '10:00',
      title: 'New Meeting',
      location: '',
      division: 'Administration',
      department: '',
      description: '',
    };

    try {
      setIsAddingMeeting(day);
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/weekly-plans/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ meeting: newMeeting }),
      });

      if (res.ok) {
        const result = await res.json();
        setPlan(result.plan);
        setMessage('✅ Meeting added successfully!');
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to add meeting: ${error}`);
      }
    } catch (error) {
      console.error('Error adding meeting:', error);
      setMessage('❌ Failed to add meeting');
    } finally {
      setIsAddingMeeting(null);
    }
  };

  // Delete meeting
  const deleteMeeting = async (meetingId: string): Promise<void> => {
    if (!window.confirm('Delete this meeting?')) return;

    try {
      setIsDeletingMeeting(meetingId);
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/weekly-plans/${id}?meetingId=${meetingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setPlan({ ...result.plan });
        setMessage('✅ Meeting deleted successfully!');
        // Remove from custom location map
        const newCustom = { ...customLocation };
        delete newCustom[meetingId];
        setCustomLocation(newCustom);
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to delete meeting: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setMessage('❌ Failed to delete meeting');
    } finally {
      setIsDeletingMeeting(null);
    }
  };

  const getMeetingsForDay = (day: string): Meeting[] => {
    if (!plan) return [];
    return plan.meetings
      .filter((m) => m.day === day)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 flex items-center justify-center">
          <Text>Loading plan...</Text>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex bg-slate-50 min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <Card>
            <Text color="red">Plan not found</Text>
            <Button mt="3" onClick={() => router.push('/dashboard/weekly-plan')}>
              <FaArrowLeft /> Back to Plans
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-64">
        {/* Header */}
        <Flex align="center" justify="between" mb="5" wrap="wrap">
          <Box>
            <Flex align="center" gap="3">
              <Button variant="soft" onClick={() => router.push('/dashboard/weekly-plan')}>
                <FaArrowLeft />
              </Button>
              <Box>
                <Heading size="6">{plan.weekLabel}</Heading>
                <Flex gap="2" mt="1" align="center">
                  <Badge variant="soft" color="blue">
                    Version {plan.version}
                  </Badge>
                  <Badge variant="soft" color="gray">
                    {plan.meetings.length} meetings
                  </Badge>
                  <Text size="1" color="gray">
                    Updated: {new Date(plan.updatedAt).toLocaleString()}
                  </Text>
                </Flex>
              </Box>
            </Flex>
          </Box>
          <Flex gap="2">
            {!isEditing ? (
              <>
                <Button onClick={() => setIsEditing(true)}>
                  <FaEdit /> Edit
                </Button>
                <Button variant="soft" color="red" onClick={handleDelete}>
                  <FaTrash /> Delete
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  <FaSave /> {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    setIsEditing(false);
                    fetchPlan();
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </Flex>
        </Flex>

        {message && (
          <Text size="2" color={message.includes('✅') ? 'green' : 'red'} mb="3">
            {message}
          </Text>
        )}

        {/* Plan Details */}
        <Card size="3" mb="4">
          <div className="grid md:grid-cols-4 gap-4">
            <Box>
              <Text size="2" weight="medium">
                Week Number
              </Text>
              {isEditing ? (
                <TextField.Root
                  type="number"
                  value={plan.weekNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlan({ ...plan, weekNumber: Number(e.target.value) })
                  }
                  mt="1"
                />
              ) : (
                <Text size="2">{plan.weekNumber}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">
                Year
              </Text>
              {isEditing ? (
                <TextField.Root
                  type="number"
                  value={plan.year}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlan({ ...plan, year: Number(e.target.value) })
                  }
                  mt="1"
                />
              ) : (
                <Text size="2">{plan.year}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">
                Start Date
              </Text>
              {isEditing ? (
                <TextField.Root
                  type="date"
                  value={
                    plan.startDate
                      ? new Date(plan.startDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlan({ ...plan, startDate: e.target.value })
                  }
                  mt="1"
                />
              ) : (
                <Text size="2">{new Date(plan.startDate).toLocaleDateString()}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">
                End Date
              </Text>
              {isEditing ? (
                <TextField.Root
                  type="date"
                  value={
                    plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : ''
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPlan({ ...plan, endDate: e.target.value })
                  }
                  mt="1"
                />
              ) : (
                <Text size="2">{new Date(plan.endDate).toLocaleDateString()}</Text>
              )}
            </Box>
          </div>
        </Card>

        {/* Meetings Grid */}
        <Card size="3">
          <Flex align="center" justify="between" mb="3">
            <Text size="3" weight="bold">
              📋 Meetings ({plan.meetings.length})
            </Text>
            {isEditing && (
              <Text size="2" color="gray" className="text-xs">
                Click '+' to add | Click 🗑️ to delete
              </Text>
            )}
          </Flex>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
            {DAYS.map((day) => {
              const dayMeetings = getMeetingsForDay(day);
              return (
                <div
                  key={day}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50 min-h-[200px]"
                >
                  {/* Day Header */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold">
                      {day}
                      <Badge variant="soft" color="gray" ml="2">
                        {dayMeetings.length}
                      </Badge>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => addMeeting(day)}
                        disabled={isAddingMeeting === day}
                        className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-xs font-bold disabled:opacity-50"
                        title={`Add meeting to ${day}`}
                      >
                        {isAddingMeeting === day ? '...' : <FaPlus size={12} />}
                      </button>
                    )}
                  </div>

                  {/* Meeting Cards */}
                  {dayMeetings.map((meeting) => (
                    <div
                      key={meeting._id}
                      className="bg-white border border-slate-200 rounded-lg p-2 mb-2 shadow-sm relative"
                      style={{
                        borderLeft: `4px solid ${DIVISION_COLORS[meeting.division] || '#888'}`,
                      }}
                    >
                      {isEditing ? (
                        // ==========================================
                        // EDIT MODE
                        // ==========================================
                        <>
                          {/* Time + Delete Button */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-1">
                              <input
                                type="time"
                                value={meeting.timeStart}
                                onChange={(e) =>
                                  updateMeeting(meeting._id, 'timeStart', e.target.value)
                                }
                                className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={meeting.timeEnd}
                                onChange={(e) =>
                                  updateMeeting(meeting._id, 'timeEnd', e.target.value)
                                }
                                className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteMeeting(meeting._id)}
                              disabled={isDeletingMeeting === meeting._id}
                              className="text-red-400 hover:text-red-600 text-xs ml-1 disabled:opacity-50 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                              title="Delete meeting"
                            >
                              {isDeletingMeeting === meeting._id ? '...' : <FaTrash size={12} />}
                            </button>
                          </div>

                          {/* Title */}
                          <input
                            value={meeting.title}
                            onChange={(e) =>
                              updateMeeting(meeting._id, 'title', e.target.value)
                            }
                            className="w-full text-sm font-medium border border-slate-200 rounded px-2 py-0.5 mt-1"
                          />

                          {/* ========================================================= */}
                          {/* ✅ LOCATION DROPDOWN WITH "Others" SUPPORT (FIXED) */}
                          {/* ========================================================= */}
                          <div className="mt-1">
                            <select
                              value={getLocationDisplay(meeting)}
                              onChange={(e) => handleLocationChange(meeting._id, e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-1 py-0.5"
                            >
                              <option value="">No Location</option>
                              {LOCATION_OPTIONS.map((loc) => (
                                <option key={loc} value={loc}>
                                  {loc}
                                </option>
                              ))}
                            </select>

                            {/* ✅ Custom location text input – appears when "Others" is selected */}
                            {getLocationDisplay(meeting) === 'Others' && (
                              <input
                                type="text"
                                value={customLocation[meeting._id] || ''}
                                onChange={(e) =>
                                  handleCustomLocationChange(meeting._id, e.target.value)
                                }
                                placeholder="Enter custom location..."
                                className="w-full text-xs border-2 border-blue-300 rounded px-2 py-0.5 mt-1 bg-blue-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                            )}
                          </div>

                          {/* Division */}
                          <select
                            value={meeting.division}
                            onChange={(e) =>
                              updateMeeting(meeting._id, 'division', e.target.value)
                            }
                            className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1"
                          >
                            {DIVISIONS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>

                          {/* Department */}
                          <select
                            value={meeting.department || ''}
                            onChange={(e) =>
                              updateMeeting(meeting._id, 'department', e.target.value)
                            }
                            className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1 text-slate-500"
                          >
                            {DEPARTMENTS.map((d) => (
                              <option key={d} value={d}>{d || 'No Dept'}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        // ==========================================
                        // VIEW MODE - Read only
                        // ==========================================
                        <>
                          <Text size="2" weight="bold" as="div">
                            {meeting.timeStart} - {meeting.timeEnd}
                          </Text>
                          <Text size="2" weight="bold" as="div">
                            {meeting.title}
                          </Text>
                          <Text size="1" color="gray" as="div">
                            🏢 {meeting.division}{' '}
                            {meeting.department ? `(${meeting.department})` : ''}
                          </Text>
                          {meeting.location && (
                            <Text size="1" color="gray" as="div">
                              📍 {meeting.location}
                            </Text>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {dayMeetings.length === 0 && (
                    <Text size="1" color="gray" align="center" className="mt-4 block">
                      {isEditing ? 'Click + to add' : 'No meetings'}
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Public Link */}
        <Card size="2" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Box>
              <Text weight="bold">🔗 Public Link</Text>
              <Text size="2" color="gray">
                Share this link with staff (no login required)
              </Text>
            </Box>
            <Flex gap="2">
              <Text size="2" style={{ wordBreak: 'break-all' }}>
                {`${window.location.origin}/weekly-plan/${plan._id}`}
              </Text>
              <Button
                size="1"
                onClick={() => {
                  const link = `${window.location.origin}/weekly-plan/${plan._id}`;
                  navigator.clipboard.writeText(link);
                  alert('Link copied to clipboard!');
                }}
              >
                <FaCopy />
              </Button>
            </Flex>
          </Flex>
        </Card>
      </main>
    </div>
  );
}