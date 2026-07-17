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
  tasks: string[]; // 🆕 Week-long tasks
  legend: { key: string; value: string }[]; // 🆕 Legend items
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

  const [customLocation, setCustomLocation] = useState<Record<string, string>>({});
  const [stakeholderInput, setStakeholderInput] = useState<Record<string, string>>({});

  // 🆕 State for tasks and legend
  const [tasks, setTasks] = useState<string[]>([]);
  const [legendItems, setLegendItems] = useState<{ key: string; value: string }[]>([]);

  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);

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
        // 🆕 Initialize tasks and legend from fetched data
        setTasks(data.tasks || []);
        setLegendItems(data.legend || []);
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

      // 🆕 Filter empty tasks and legend items
      const filteredTasks = tasks.filter((t) => t.trim() !== '');
      const filteredLegend = legendItems.filter(
        (item) => item.key.trim() !== '' && item.value.trim() !== ''
      );

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
          tasks: filteredTasks, // 🆕
          legend: filteredLegend, // 🆕
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage('✅ Plan updated successfully!');
        setIsEditing(false);
        setPlan(result.plan);
        setTasks(result.plan.tasks || []);
        setLegendItems(result.plan.legend || []);
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

  const getLocationDisplay = (meeting: Meeting): string => {
    if (customLocation[meeting._id] !== undefined) return 'Others';
    if (meeting.location && LOCATION_OPTIONS.includes(meeting.location)) return meeting.location;
    return '';
  };

  const handleLocationChange = (meetingId: string, value: string): void => {
    if (!plan) return;
    if (value === 'Others') {
      const existingCustom = customLocation[meetingId] || '';
      setCustomLocation((prev) => ({ ...prev, [meetingId]: existingCustom }));
      const updatedMeetings = plan.meetings.map((meeting) => {
        if (meeting._id === meetingId) {
          return { ...meeting, location: '' };
        }
        return meeting;
      });
      setPlan({ ...plan, meetings: updatedMeetings });
    } else {
      const updatedMeetings = plan.meetings.map((meeting) => {
        if (meeting._id === meetingId) {
          return { ...meeting, location: value };
        }
        return meeting;
      });
      setPlan({ ...plan, meetings: updatedMeetings });
      const newCustom = { ...customLocation };
      delete newCustom[meetingId];
      setCustomLocation(newCustom);
    }
  };

  const handleCustomLocationChange = (meetingId: string, value: string): void => {
    setCustomLocation((prev) => ({ ...prev, [meetingId]: value }));
  };

  // =========================================================
  // DEPARTMENT HANDLERS
  // =========================================================

  const getDepartmentArray = (meeting: Meeting): string[] => {
    if (!meeting.department) return [];
    return meeting.department.split(',').map((d) => d.trim()).filter(Boolean);
  };

  const handleDepartmentChange = (meetingId: string, selectedValues: string[]): void => {
    if (!plan) return;
    const departmentString = selectedValues.join(', ');
    const updatedMeetings = plan.meetings.map((meeting) => {
      if (meeting._id === meetingId) {
        return { ...meeting, department: departmentString };
      }
      return meeting;
    });
    setPlan({ ...plan, meetings: updatedMeetings });
  };

  const removeDepartmentFromMeeting = (meetingId: string, departmentToRemove: string): void => {
    if (!plan) return;
    const meeting = plan.meetings.find((m) => m._id === meetingId);
    if (!meeting) return;
    const currentDepartments = getDepartmentArray(meeting);
    const updatedDepartments = currentDepartments.filter((d) => d !== departmentToRemove);
    const departmentString = updatedDepartments.join(', ');
    const updatedMeetings = plan.meetings.map((m) => {
      if (m._id === meetingId) {
        return { ...m, department: departmentString };
      }
      return m;
    });
    setPlan({ ...plan, meetings: updatedMeetings });
  };

  // =========================================================
  // STAKEHOLDER HANDLERS
  // =========================================================

  const getStakeholderArray = (meeting: Meeting): string[] => {
    if (!meeting.stakeholders) return [];
    return meeting.stakeholders.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const addStakeholder = (meetingId: string): void => {
    if (!plan) return;
    const inputValue = stakeholderInput[meetingId] || '';
    if (!inputValue.trim()) return;

    const meeting = plan.meetings.find((m) => m._id === meetingId);
    if (!meeting) return;

    const currentStakeholders = getStakeholderArray(meeting);
    if (currentStakeholders.includes(inputValue.trim())) {
      alert('Stakeholder already added');
      return;
    }

    const updatedStakeholders = [...currentStakeholders, inputValue.trim()];
    const updatedMeetings = plan.meetings.map((m) => {
      if (m._id === meetingId) {
        return { ...m, stakeholders: updatedStakeholders.join(', ') };
      }
      return m;
    });
    setPlan({ ...plan, meetings: updatedMeetings });
    setStakeholderInput((prev) => ({ ...prev, [meetingId]: '' }));
  };

  const handleStakeholderInputChange = (meetingId: string, value: string): void => {
    setStakeholderInput((prev) => ({ ...prev, [meetingId]: value }));
  };

  const handleStakeholderKeyDown = (meetingId: string, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStakeholder(meetingId);
    }
  };

  const removeStakeholder = (meetingId: string, stakeholderToRemove: string): void => {
    if (!plan) return;
    const meeting = plan.meetings.find((m) => m._id === meetingId);
    if (!meeting) return;

    const currentStakeholders = getStakeholderArray(meeting);
    const updatedStakeholders = currentStakeholders.filter((s) => s !== stakeholderToRemove);
    const updatedMeetings = plan.meetings.map((m) => {
      if (m._id === meetingId) {
        return { ...m, stakeholders: updatedStakeholders.join(', ') };
      }
      return m;
    });
    setPlan({ ...plan, meetings: updatedMeetings });
  };

  // =========================================================
  // 🆕 TASK HANDLERS
  // =========================================================

  const addTask = () => {
    setTasks([...tasks, '']);
  };

  const updateTask = (index: number, value: string) => {
    const updated = [...tasks];
    updated[index] = value;
    setTasks(updated);
  };

  const deleteTask = (index: number) => {
    if (!window.confirm('Delete this task?')) return;
    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);
  };

  // =========================================================
  // 🆕 LEGEND HANDLERS
  // =========================================================

  const addLegendItem = () => {
    setLegendItems([...legendItems, { key: '', value: '' }]);
  };

  const updateLegendItem = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...legendItems];
    updated[index][field] = value;
    setLegendItems(updated);
  };

  const deleteLegendItem = (index: number) => {
    if (!window.confirm('Delete this legend item?')) return;
    const updated = legendItems.filter((_, i) => i !== index);
    setLegendItems(updated);
  };

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
      stakeholders: '',
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

  const deleteMeeting = async (meetingId: string): Promise<void> => {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      setIsDeletingMeeting(meetingId);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}?meetingId=${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setPlan({ ...result.plan });
        setMessage('✅ Meeting deleted successfully!');
        const newCustomLoc = { ...customLocation };
        delete newCustomLoc[meetingId];
        setCustomLocation(newCustomLoc);
        const newStakeInput = { ...stakeholderInput };
        delete newStakeInput[meetingId];
        setStakeholderInput(newStakeInput);
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

        {/* Meetings Grid */}
        <Card size="3">
          <Flex align="center" justify="between" mb="3">
            <Text size="3" weight="bold">📋 Meetings ({plan.meetings.length})</Text>
            {isEditing && (
              <Text size="2" color="gray" className="text-xs">
                Click '+' to add | Click 🗑️ to delete
              </Text>
            )}
          </Flex>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start">
            {DAYS.map((day) => {
              const dayMeetings = getMeetingsForDay(day);
              const hasMeetings = dayMeetings.length > 0;
              return (
                <div
                  key={day}
                  className={`border border-slate-200 rounded-lg p-3 bg-slate-50 ${
                    hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-sm">
                      {day}
                      <Badge variant="soft" color="gray" ml="2" size="1">
                        {dayMeetings.length}
                      </Badge>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => addMeeting(day)}
                        disabled={isAddingMeeting === day}
                        className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-xs font-bold disabled:opacity-50 flex-shrink-0"
                        title={`Add meeting to ${day}`}
                      >
                        {isAddingMeeting === day ? '...' : <FaPlus size={12} />}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayMeetings.map((meeting) => {
                      const departmentArray = getDepartmentArray(meeting);
                      const stakeholderArray = getStakeholderArray(meeting);
                      return (
                        <div
                          key={meeting._id}
                          className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm relative"
                          style={{
                            borderLeft: `4px solid ${DIVISION_COLORS[meeting.division] || '#888'}`,
                          }}
                        >
                          {isEditing ? (
                            // EDIT MODE
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1 flex-1">
                                  <input
                                    type="time"
                                    value={meeting.timeStart}
                                    onChange={(e) => updateMeeting(meeting._id, 'timeStart', e.target.value)}
                                    className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                  />
                                  <span className="text-xs">-</span>
                                  <input
                                    type="time"
                                    value={meeting.timeEnd}
                                    onChange={(e) => updateMeeting(meeting._id, 'timeEnd', e.target.value)}
                                    className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteMeeting(meeting._id)}
                                  disabled={isDeletingMeeting === meeting._id}
                                  className="text-red-400 hover:text-red-600 text-xs ml-1 disabled:opacity-50 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 flex-shrink-0"
                                  title="Delete meeting"
                                >
                                  {isDeletingMeeting === meeting._id ? '...' : <FaTrash size={12} />}
                                </button>
                              </div>

                              <input
                                value={meeting.title}
                                onChange={(e) => updateMeeting(meeting._id, 'title', e.target.value)}
                                className="w-full text-sm font-medium border border-slate-200 rounded px-2 py-0.5 mt-1"
                              />

                              {/* Location Dropdown */}
                              <div className="mt-1">
                                <select
                                  value={getLocationDisplay(meeting)}
                                  onChange={(e) => handleLocationChange(meeting._id, e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded px-1 py-0.5"
                                >
                                  <option value="">No Location</option>
                                  {LOCATION_OPTIONS.map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                  ))}
                                </select>
                                {getLocationDisplay(meeting) === 'Others' && (
                                  <input
                                    type="text"
                                    value={customLocation[meeting._id] || ''}
                                    onChange={(e) => handleCustomLocationChange(meeting._id, e.target.value)}
                                    placeholder="Enter custom location..."
                                    className="w-full text-xs border-2 border-blue-300 rounded px-2 py-0.5 mt-1 bg-blue-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                )}
                              </div>

                              {/* Division */}
                              <select
                                value={meeting.division}
                                onChange={(e) => updateMeeting(meeting._id, 'division', e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1"
                              >
                                {DIVISIONS.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>

                              {/* Departments Multi-Select */}
                              <div className="mt-1">
                                <label className="text-xs text-slate-500 block mb-0.5">
                                  Departments (hold Ctrl/Cmd for multiple)
                                </label>
                                <select
                                  multiple
                                  value={departmentArray}
                                  onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                                    handleDepartmentChange(meeting._id, selected);
                                  }}
                                  className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 min-h-[50px]"
                                  size={3}
                                >
                                  {departmentsLoading ? (
                                    <option value="" disabled>Loading...</option>
                                  ) : departments.length === 0 ? (
                                    <option value="" disabled>No departments</option>
                                  ) : (
                                    departments.map((dept) => (
                                      <option key={dept} value={dept}>{dept}</option>
                                    ))
                                  )}
                                </select>

                                {departmentArray.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {departmentArray.map((dept) => (
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
                                          onClick={() => removeDepartmentFromMeeting(meeting._id, dept)}
                                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-3 h-3 flex items-center justify-center text-xs leading-none"
                                          title={`Remove ${dept}`}
                                        >
                                          ✕
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* STAKEHOLDERS */}
                              <div className="mt-1">
                                <label className="text-xs text-slate-500 block mb-0.5">
                                  Stakeholders (External)
                                </label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={stakeholderInput[meeting._id] || ''}
                                    onChange={(e) =>
                                      handleStakeholderInputChange(meeting._id, e.target.value)
                                    }
                                    onKeyDown={(e) => handleStakeholderKeyDown(meeting._id, e)}
                                    placeholder="Type stakeholder name..."
                                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-0.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addStakeholder(meeting._id)}
                                    className="w-6 h-6 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    title="Add stakeholder"
                                  >
                                    <FaPlus size={10} />
                                  </button>
                                </div>

                                {stakeholderArray.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {stakeholderArray.map((stakeholder) => (
                                      <Badge
                                        key={stakeholder}
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
                                        👤 {stakeholder}
                                        <button
                                          type="button"
                                          onClick={() => removeStakeholder(meeting._id, stakeholder)}
                                          className="text-white hover:text-purple-200 rounded-full w-3 h-3 flex items-center justify-center text-xs leading-none hover:bg-purple-600"
                                          title={`Remove ${stakeholder}`}
                                        >
                                          ✕
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            // VIEW MODE
                            <>
                              <Text size="2" weight="bold" as="div">
                                {meeting.timeStart} - {meeting.timeEnd}
                              </Text>
                              <Text size="2" weight="bold" as="div">
                                {meeting.title}
                              </Text>
                              <Text size="1" color="gray" as="div">
                                🏢 {meeting.division}
                              </Text>
                              {meeting.department && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meeting.department.split(',').map((dept) => (
                                    <Badge key={dept.trim()} variant="soft" color="blue" size="1">
                                      {dept.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {meeting.location && (
                                <Text size="1" color="gray" as="div">
                                  📍 {meeting.location}
                                </Text>
                              )}
                              {meeting.stakeholders && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meeting.stakeholders.split(',').map((stakeholder) => (
                                    <Badge
                                      key={stakeholder.trim()}
                                      variant="solid"
                                      color="purple"
                                      size="1"
                                      style={{
                                        background: '#7c3aed',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                      }}
                                    >
                                      👤 {stakeholder.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </>
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
        {/* 🆕 WEEK-LONG TASKS SECTION */}
        {/* ========================================================= */}
        <Card size="3" mt="4">
          <Flex align="center" justify="between" mb="3">
            <Box>
              <Text size="3" weight="bold">📌 Week-long Tasks</Text>
              <Text size="2" color="gray">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </Text>
            </Box>
            {isEditing && (
              <Button type="button" variant="soft" onClick={addTask}>
                <FaPlus /> Add Task
              </Button>
            )}
          </Flex>

          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => updateTask(index, e.target.value)}
                      placeholder="Enter task description..."
                      className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => deleteTask(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Delete task"
                    >
                      <FaTrash size={14} />
                    </button>
                  </>
                ) : (
                  <Text size="2" className="text-slate-700 py-1">
                    • {task}
                  </Text>
                )}
              </div>
            ))}
            {tasks.length === 0 && (
              <Text size="2" color="gray" align="center" className="py-2">
                No tasks added yet.
              </Text>
            )}
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 🆕 LEGEND SECTION */}
        {/* ========================================================= */}
        <Card size="3" mt="4">
          <Flex align="center" justify="between" mb="3">
            <Box>
              <Text size="3" weight="bold">📖 Legend</Text>
              <Text size="2" color="gray">
                {legendItems.length} item{legendItems.length !== 1 ? 's' : ''}
              </Text>
            </Box>
            {isEditing && (
              <Button type="button" variant="soft" onClick={addLegendItem}>
                <FaPlus /> Add Legend Entry
              </Button>
            )}
          </Flex>

          <div className="space-y-2">
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => updateLegendItem(index, 'key', e.target.value)}
                      placeholder="Acronym (e.g., ACC)"
                      className="w-32 text-sm border border-slate-200 rounded px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateLegendItem(index, 'value', e.target.value)}
                      placeholder="Full form (e.g., Anti-Corruption Commission)"
                      className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => deleteLegendItem(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Delete legend item"
                    >
                      <FaTrash size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 py-1 text-sm">
                    <span className="font-medium text-slate-700 w-32 flex-shrink-0">{item.key}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-600">{item.value}</span>
                  </div>
                )}
              </div>
            ))}
            {legendItems.length === 0 && (
              <Text size="2" color="gray" align="center" className="py-2">
                No legend entries added yet.
              </Text>
            )}
          </div>
        </Card>

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

        {/* ========================================================= */}
        {/* ✅ EMAIL NOTIFICATION – with improved test button */}
        {/* ========================================================= */}
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
            <Flex gap="2" wrap="wrap">
              {/* Send to Staff (placeholder) */}
              <Button
                onClick={() => {
                  alert('🚧 Mass email to staff will be implemented later.');
                }}
                style={{ background: '#1976d2', color: 'white' }}
              >
                📧 Send to Staff
              </Button>

              {/* Send Test Email button */}
              <Button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const planId = plan?._id;

                    console.log('📤 Sending test email with planId:', planId);

                    if (!planId) {
                      alert('❌ Plan ID not available. Please refresh and try again.');
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
                    console.log('📥 Response:', data);

                    if (response.ok) {
                      alert(`✅ Test email sent to kingarinzin@acc.org.bt`);
                    } else {
                      alert(`❌ Failed: ${data.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('❌ Fetch error:', error);
                    alert('❌ Failed to send test email. Check console for details.');
                  }
                }}
                style={{ background: '#9c27b0', color: 'white' }}
              >
                📧 Send Test Email
              </Button>
            </Flex>
          </Flex>
        </Card>
      </main>
    </div>
  );
}