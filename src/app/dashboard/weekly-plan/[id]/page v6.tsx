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
  Separator,
} from '@radix-ui/themes';
import { FaArrowLeft, FaEdit, FaSave, FaTrash, FaCopy, FaPlus, FaTimes } from 'react-icons/fa';

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
  stakeholders: string;
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
  tasks: string[];
  legend: { key: string; value: string }[];
  status: 'draft' | 'sent' | 'updated';
  version: number;
  updatedAt: string;
}

const DAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DIVISIONS: string[] = ['Administration', 'IT', 'Finance', 'HR', 'Operations', 'Legal', 'Communications'];

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

// =========================================================
// Helper: Get formatted date for a given day (ordinal + month)
// =========================================================
function getDateForDay(startDateStr: string, dayName: string): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startDate = new Date(startDateStr);
  const dayIndex = days.indexOf(dayName);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + dayIndex);

  const day = targetDate.getDate();
  const month = targetDate.toLocaleString('default', { month: 'long' });
  const ordinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${ordinal(day)} ${month}`;
}

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

  // Custom location map (for existing meetings with custom locations)
  const [customLocation, setCustomLocation] = useState<Record<string, string>>({});

  // Departments
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);

  // Email sending states
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [isSendingMassEmail, setIsSendingMassEmail] = useState<boolean>(false);

  // =========================================================
  // DRAWER STATE
  // =========================================================
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // null = add mode
  const [formData, setFormData] = useState<Meeting>({
    _id: '',
    day: '',
    timeStart: '09:00',
    timeEnd: '10:00',
    title: '',
    location: '',
    division: 'Administration',
    department: '',
    stakeholders: '',
    description: '',
  });
  const [customLocationDrawer, setCustomLocationDrawer] = useState<string>('');
  const [stakeholderInputDrawer, setStakeholderInputDrawer] = useState<string>('');

  // =========================================================
  // FETCH DEPARTMENTS
  // =========================================================
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          const departmentNames = data.map((dept: any) => dept.name).filter(Boolean);
          setDepartments(departmentNames);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  // =========================================================
  // FETCH PLAN
  // =========================================================
  useEffect(() => {
    fetchPlan();
  }, [id]);

  const fetchPlan = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: WeekPlan = await res.json();
        setPlan(data);
        const customLocMap: Record<string, string> = {};
        data.meetings.forEach((m) => {
          if (m.location && !LOCATION_OPTIONS.includes(m.location)) {
            customLocMap[m._id] = m.location;
          }
        });
        setCustomLocation(customLocMap);
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

  // =========================================================
  // MAIN SAVE (Plan-wide)
  // =========================================================
  const handleSave = async (): Promise<void> => {
    if (!plan) return;
    try {
      setSaving(true);
      setMessage('');
      const token = localStorage.getItem('token');

      const meetingsWithCustom = plan.meetings.map((meeting) => {
        let updated = { ...meeting };
        if (customLocation[meeting._id] !== undefined) {
          updated.location = customLocation[meeting._id];
        }
        return updated;
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
          meetings: meetingsWithCustom,
          tasks: plan.tasks || [],
          legend: plan.legend || [],
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage('✅ Plan updated successfully!');
        setIsEditing(false);
        setPlan(result.plan);
        const customLocMap: Record<string, string> = {};
        result.plan.meetings.forEach((m: Meeting) => {
          if (m.location && !LOCATION_OPTIONS.includes(m.location)) {
            customLocMap[m._id] = m.location;
          }
        });
        setCustomLocation(customLocMap);
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

  // =========================================================
  // DELETE PLAN
  // =========================================================
  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete "${plan?.weekLabel}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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

  // =========================================================
  // DRAWER HANDLERS
  // =========================================================

  // Open drawer for adding a new meeting
  const openDrawerForAdd = (day: string) => {
    setEditingIndex(null);
    setFormData({
      _id: '',
      day: day,
      timeStart: '09:00',
      timeEnd: '10:00',
      title: '',
      location: '',
      division: 'Administration',
      department: '',
      stakeholders: '',
      description: '',
    });
    setCustomLocationDrawer('');
    setStakeholderInputDrawer('');
    setDrawerOpen(true);
  };

  // Open drawer for editing an existing meeting
  const openDrawerForEdit = (index: number) => {
    const meeting = plan!.meetings[index];
    setEditingIndex(index);
    setFormData({ ...meeting });
    // Check if location is custom (not in LOCATION_OPTIONS)
    if (meeting.location && !LOCATION_OPTIONS.includes(meeting.location)) {
      setCustomLocationDrawer(meeting.location);
    } else {
      setCustomLocationDrawer('');
    }
    setStakeholderInputDrawer('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingIndex(null);
  };

  // Save meeting from drawer (updates local state)
  const saveMeetingFromDrawer = () => {
    // Build final location
    let finalLocation = formData.location;
    if (formData.location === 'Others') {
      finalLocation = customLocationDrawer || '';
    }

    const newMeeting: Meeting = {
      ...formData,
      location: finalLocation,
    };

    // Validate required fields
    if (!newMeeting.title.trim()) {
      alert('Meeting Title is required.');
      return;
    }
    if (!newMeeting.division) {
      alert('Meeting Type is required.');
      return;
    }

    // If editingIndex is not null, update existing meeting; else add new
    const currentMeetings = plan!.meetings;
    let updatedMeetings;
    if (editingIndex !== null) {
      updatedMeetings = [...currentMeetings];
      updatedMeetings[editingIndex] = newMeeting;
    } else {
      // New meeting – generate a temporary _id
      newMeeting._id = `temp-${Date.now()}`;
      updatedMeetings = [...currentMeetings, newMeeting];
    }
    setPlan({ ...plan!, meetings: updatedMeetings });
    closeDrawer();
  };

  // Delete meeting from drawer (only when editing)
  const deleteMeetingFromDrawer = () => {
    if (editingIndex === null) return;
    if (!window.confirm('Delete this meeting?')) return;
    const updatedMeetings = plan!.meetings.filter((_, i) => i !== editingIndex);
    setPlan({ ...plan!, meetings: updatedMeetings });
    closeDrawer();
  };

  // Clone and delete from card (quick actions)
  const cloneMeeting = (index: number) => {
    const meeting = plan!.meetings[index];
    const cloned: Meeting = {
      ...meeting,
      _id: `temp-${Date.now()}`,
      title: meeting.title + ' (Copy)',
    };
    const updated = [...plan!.meetings];
    updated.splice(index + 1, 0, cloned);
    setPlan({ ...plan!, meetings: updated });
  };

  const deleteMeetingFromCard = async (meetingId: string) => {
    if (!window.confirm('Delete this meeting?')) return;
    // If it's a temporary meeting (startswith 'temp-'), just remove locally
    if (meetingId.startsWith('temp-')) {
      const updated = plan!.meetings.filter((m) => m._id !== meetingId);
      setPlan({ ...plan!, meetings: updated });
      return;
    }
    // Otherwise, call API to delete from server
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}?meetingId=${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setPlan(result.plan);
        // Update customLocation map
        const newCustomLoc = { ...customLocation };
        delete newCustomLoc[meetingId];
        setCustomLocation(newCustomLoc);
        setMessage('✅ Meeting deleted successfully!');
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to delete meeting: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setMessage('❌ Failed to delete meeting');
    }
  };

  // =========================================================
  // DRAWER FORM HANDLERS
  // =========================================================
  const handleFormChange = (field: keyof Meeting, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleLocationChange = (value: string) => {
    setFormData({ ...formData, location: value });
    if (value !== 'Others') {
      setCustomLocationDrawer('');
    }
  };

  // Department multi-select
  const getDepartmentArray = (departmentsStr: string): string[] => {
    if (!departmentsStr) return [];
    return departmentsStr.split(',').map((d) => d.trim()).filter(Boolean);
  };

  const handleDepartmentChange = (selected: string[]) => {
    setFormData({ ...formData, department: selected.join(', ') });
  };

  const removeDepartment = (deptToRemove: string) => {
    const current = getDepartmentArray(formData.department);
    const updated = current.filter((d) => d !== deptToRemove);
    setFormData({ ...formData, department: updated.join(', ') });
  };

  // Stakeholder handlers
  const getStakeholderArray = (stakeholdersStr: string): string[] => {
    if (!stakeholdersStr) return [];
    return stakeholdersStr.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const addStakeholder = () => {
    const current = getStakeholderArray(formData.stakeholders);
    const newStakeholder = stakeholderInputDrawer.trim();
    if (!newStakeholder) return;
    if (current.includes(newStakeholder)) {
      alert('Stakeholder already added.');
      return;
    }
    const updated = [...current, newStakeholder];
    setFormData({ ...formData, stakeholders: updated.join(', ') });
    setStakeholderInputDrawer('');
  };

  const removeStakeholder = (stakeholderToRemove: string) => {
    const current = getStakeholderArray(formData.stakeholders);
    const updated = current.filter((s) => s !== stakeholderToRemove);
    setFormData({ ...formData, stakeholders: updated.join(', ') });
  };

  // =========================================================
  // GET MEETINGS BY DAY
  // =========================================================
  const getMeetingsForDay = (day: string): Meeting[] => {
    if (!plan) return [];
    return plan.meetings
      .filter((m) => m.day === day)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  };

  // =========================================================
  // RENDER
  // =========================================================
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
                  <Badge variant="soft" color="blue">Version {plan.version}</Badge>
                  <Badge variant="soft" color="gray">{plan.meetings.length} meetings</Badge>
                  <Text size="1" color="gray">Updated: {new Date(plan.updatedAt).toLocaleString()}</Text>
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
              <Text size="2" weight="medium">Week Number</Text>
              {isEditing ? (
                <TextField.Root
                  type="number"
                  value={plan.weekNumber}
                  onChange={(e) => setPlan({ ...plan, weekNumber: Number(e.target.value) })}
                  mt="1"
                />
              ) : (
                <Text size="2">{plan.weekNumber}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">Year</Text>
              {isEditing ? (
                <TextField.Root
                  type="number"
                  value={plan.year}
                  onChange={(e) => setPlan({ ...plan, year: Number(e.target.value) })}
                  mt="1"
                />
              ) : (
                <Text size="2">{plan.year}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">Start Date</Text>
              {isEditing ? (
                <TextField.Root
                  type="date"
                  value={plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setPlan({ ...plan, startDate: e.target.value })}
                  mt="1"
                />
              ) : (
                <Text size="2">{new Date(plan.startDate).toLocaleDateString()}</Text>
              )}
            </Box>
            <Box>
              <Text size="2" weight="medium">End Date</Text>
              {isEditing ? (
                <TextField.Root
                  type="date"
                  value={plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setPlan({ ...plan, endDate: e.target.value })}
                  mt="1"
                />
              ) : (
                <Text size="2">{new Date(plan.endDate).toLocaleDateString()}</Text>
              )}
            </Box>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* MEETINGS GRID – with compact cards and drawer */}
        {/* ========================================================= */}
        <Card size="3">
          <Flex align="center" justify="between" mb="3">
            <Text size="3" weight="bold">📋 Meetings ({plan.meetings.length})</Text>
            {isEditing && (
              <Text size="2" color="gray" className="text-xs">
                Click '+' to add | Click a card to edit
              </Text>
            )}
          </Flex>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start">
            {DAYS.map((day) => {
              const dayMeetings = getMeetingsForDay(day);
              const hasMeetings = dayMeetings.length > 0;
              const dateDisplay = plan?.startDate ? getDateForDay(plan.startDate, day) : '';

              return (
                <div
                  key={day}
                  className={`border border-slate-200 rounded-lg p-3 bg-slate-50 ${
                    hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <Text weight="bold" size="2">
                        {day} <span className="text-xs text-slate-500 font-normal">({dateDisplay})</span>
                      </Text>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openDrawerForAdd(day)}
                        className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                        title="Add meeting"
                      >
                        <FaPlus size={12} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayMeetings.map((meeting, index) => {
                      const realIndex = plan.meetings.indexOf(meeting);
                      return (
                        <div
                          key={meeting._id}
                          className={`bg-white border border-slate-200 rounded-lg p-2 shadow-sm relative ${
                            isEditing ? 'hover:shadow-md cursor-pointer' : ''
                          }`}
                          style={{
                            borderLeft: `4px solid ${DIVISION_COLORS[meeting.division] || '#888'}`,
                          }}
                          onClick={() => {
                            if (isEditing) {
                              openDrawerForEdit(realIndex);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <Text size="2" weight="bold">
                              {meeting.timeStart} - {meeting.timeEnd}
                            </Text>
                            {isEditing && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cloneMeeting(realIndex);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                                  title="Clone meeting"
                                >
                                  <FaCopy size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMeetingFromCard(meeting._id);
                                  }}
                                  className="text-red-400 hover:text-red-600 text-xs p-1"
                                  title="Delete meeting"
                                >
                                  <FaTrash size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          <Text size="2" weight="medium" className="mt-0.5">
                            {meeting.title || '(Untitled)'}
                          </Text>
                          <Text size="1" color="gray">
                            🏢 {meeting.division}
                          </Text>
                          {meeting.location && (
                            <Text size="1" color="gray">
                              📍 {meeting.location}
                            </Text>
                          )}
                          {meeting.department && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meeting.department.split(',').map((d) => (
                                <Badge key={d.trim()} variant="soft" color="blue" size="1">
                                  {d.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {meeting.stakeholders && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meeting.stakeholders.split(',').map((s) => (
                                <Badge
                                  key={s.trim()}
                                  variant="solid"
                                  color="purple"
                                  size="1"
                                  style={{
                                    background: '#7c3aed',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                  }}
                                >
                                  👤 {s.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!hasMeetings && (
                    <div className="flex items-center justify-center h-12">
                      <Text size="1" color="gray" align="center">No meetings</Text>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ========================================================= */}
        {/* TASKS & LEGEND SECTIONS (unchanged) */}
        {/* ========================================================= */}
        {plan.tasks && plan.tasks.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <Flex align="center" gap="2" mb="2">
              <Text size="3" weight="bold">📌 Week-long Tasks</Text>
              <Badge variant="solid" color="orange" size="1">
                {plan.tasks.length}
              </Badge>
            </Flex>
            <div className="space-y-1">
              {plan.tasks.map((task, index) => (
                <Text key={index} size="2" className="text-slate-700 py-0.5 flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {task}
                </Text>
              ))}
            </div>
          </Card>
        )}

        {plan.legend && plan.legend.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <Flex align="center" gap="2" mb="2">
              <Text size="3" weight="bold">📖 Legend</Text>
              <Badge variant="solid" color="blue" size="1">
                {plan.legend.length}
              </Badge>
            </Flex>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {plan.legend.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 border border-slate-100">
                  <span className="font-medium text-slate-700">{item.key}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Public Link */}
        <Card size="2" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Box>
              <Text weight="bold">🔗 Public Link</Text>
              <Text size="2" color="gray">Share this link with staff (no login required)</Text>
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

        {/* Email Notification */}
        <Card size="2" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Box>
              <Text weight="bold">📧 Email Notification</Text>
              <Text size="2" color="gray">Send this week plan to all staff members</Text>
            </Box>
            <Flex gap="2" wrap="wrap">
              <Button
                onClick={async () => {
                  if (isSendingMassEmail) return;
                  try {
                    setIsSendingMassEmail(true);
                    const token = localStorage.getItem('token');
                    const planId = plan?._id;
                    if (!planId) {
                      alert('❌ Plan ID not available.');
                      return;
                    }
                    const response = await fetch('/api/weekly-plans/send', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ planId }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert(`✅ Email notification sent to all staff!`);
                    } else {
                      alert(`❌ Failed: ${data.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('❌ Fetch error:', error);
                    alert('❌ Failed to send email. Check console for details.');
                  } finally {
                    setIsSendingMassEmail(false);
                  }
                }}
                disabled={isSendingMassEmail}
                style={{
                  background: '#1976d2',
                  color: 'white',
                  opacity: isSendingMassEmail ? 0.7 : 1,
                  cursor: isSendingMassEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {isSendingMassEmail ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span> Sending...
                  </>
                ) : (
                  '📧 Send to Staff'
                )}
              </Button>

              <Button
                onClick={async () => {
                  if (isSendingTestEmail) return;
                  try {
                    setIsSendingTestEmail(true);
                    const token = localStorage.getItem('token');
                    const planId = plan?._id;
                    if (!planId) {
                      alert('❌ Plan ID not available.');
                      return;
                    }
                    const response = await fetch('/api/weekly-plans/send', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        planId,
                        testEmail: 'kingarinzin@acc.org.bt',
                      }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert(`✅ Test email sent to kingarinzin@acc.org.bt`);
                    } else {
                      alert(`❌ Failed: ${data.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('❌ Fetch error:', error);
                    alert('❌ Failed to send test email. Check console for details.');
                  } finally {
                    setIsSendingTestEmail(false);
                  }
                }}
                disabled={isSendingTestEmail}
                style={{
                  background: '#9c27b0',
                  color: 'white',
                  opacity: isSendingTestEmail ? 0.7 : 1,
                  cursor: isSendingTestEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {isSendingTestEmail ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span> Sending...
                  </>
                ) : (
                  '📧 Send Test Email'
                )}
              </Button>
            </Flex>
          </Flex>
        </Card>
      </main>

      {/* ========================================================= */}
      {/* SLIDE-IN DRAWER (Right Panel) */}
      {/* ========================================================= */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity"
            onClick={closeDrawer}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 w-full sm:w-[500px] md:w-[550px] h-full bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out">
            <div className="p-6">
              {/* Drawer Header */}
              <div className="flex justify-between items-center mb-4">
                <Heading size="5">
                  {editingIndex !== null ? 'Edit Meeting' : 'Add Meeting'}
                </Heading>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="text-slate-500 hover:text-slate-700 p-1"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <Separator className="mb-4" />

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Day (disabled, read-only) */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Day
                  </Text>
                  <TextField.Root
                    value={formData.day}
                    disabled
                    className="w-full bg-slate-100"
                  />
                </div>

                {/* Time */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Text as="label" size="2" weight="medium" className="block mb-1">
                      Start Time
                    </Text>
                    <input
                      type="time"
                      value={formData.timeStart}
                      onChange={(e) => handleFormChange('timeStart', e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <span className="text-lg text-slate-400 mt-5">–</span>
                  <div className="flex-1">
                    <Text as="label" size="2" weight="medium" className="block mb-1">
                      End Time
                    </Text>
                    <input
                      type="time"
                      value={formData.timeEnd}
                      onChange={(e) => handleFormChange('timeEnd', e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Title <span className="text-red-500">*</span>
                  </Text>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Enter meeting title..."
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Location */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Location
                  </Text>
                  <select
                    value={formData.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">No Location</option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {formData.location === 'Others' && (
                    <input
                      type="text"
                      value={customLocationDrawer}
                      onChange={(e) => setCustomLocationDrawer(e.target.value)}
                      placeholder="Enter custom location..."
                      className="w-full border-2 border-blue-300 rounded px-3 py-2 mt-2 bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  )}
                </div>

                {/* Division */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Meeting Type <span className="text-red-500">*</span>
                  </Text>
                  <select
                    value={formData.division}
                    onChange={(e) => handleFormChange('division', e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Departments */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Departments (hold Ctrl/Cmd to select multiple)
                  </Text>
                  <select
                    multiple
                    value={getDepartmentArray(formData.department)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      handleDepartmentChange(selected);
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2 min-h-[80px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    size={4}
                  >
                    {departmentsLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : departments.length === 0 ? (
                      <option value="" disabled>No departments found</option>
                    ) : (
                      departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))
                    )}
                  </select>
                  {getDepartmentArray(formData.department).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getDepartmentArray(formData.department).map((dept) => (
                        <Badge
                          key={dept}
                          variant="soft"
                          color="blue"
                          size="1"
                          className="flex items-center gap-1"
                        >
                          {dept}
                          <button
                            type="button"
                            onClick={() => removeDepartment(dept)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stakeholders */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Stakeholders (External)
                  </Text>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={stakeholderInputDrawer}
                      onChange={(e) => setStakeholderInputDrawer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStakeholder();
                        }
                      }}
                      placeholder="Type stakeholder name..."
                      className="flex-1 border border-slate-300 rounded px-3 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                    <button
                      type="button"
                      onClick={addStakeholder}
                      className="px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-bold flex items-center justify-center"
                    >
                      <FaPlus size={12} className="mr-1" /> Add
                    </button>
                  </div>
                  {getStakeholderArray(formData.stakeholders).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getStakeholderArray(formData.stakeholders).map((s) => (
                        <Badge
                          key={s}
                          variant="solid"
                          color="purple"
                          size="1"
                          className="flex items-center gap-1"
                          style={{
                            background: '#7c3aed',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          👤 {s}
                          <button
                            type="button"
                            onClick={() => removeStakeholder(s)}
                            className="text-white hover:text-purple-200 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none hover:bg-purple-600"
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Description (optional)
                  </Text>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Add any notes..."
                    rows={3}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  {editingIndex !== null && (
                    <Button
                      type="button"
                      variant="soft"
                      color="red"
                      onClick={deleteMeetingFromDrawer}
                    >
                      <FaTrash className="mr-1" /> Delete
                    </Button>
                  )}
                  <div className="flex-1"></div>
                  <Button type="button" variant="soft" onClick={closeDrawer}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={saveMeetingFromDrawer}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}