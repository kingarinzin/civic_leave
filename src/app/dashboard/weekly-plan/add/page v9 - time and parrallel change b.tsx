"use client";

import React, { FormEvent, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { FaPlus, FaTrash, FaCopy, FaEdit, FaTimes } from 'react-icons/fa';
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
  createdAt: string;
  updatedAt: string;
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
  'Commission meeting',
  'Commisison meeting on case',
  'CEC',
  'HRC',
  'Finance Committe meeting',
  'Endowment Committee meeting',
  'CM on ATR apprisal',
  'CM on complaints, IE, & ATR',
  'CM on Judgment Appraisal',
];

// Location Options
const LOCATION_OPTIONS = [
  'Druk Dradhir Khang',
  'Chungchen Phurkhang',
  'Taagtshang Sherab Jorden Khang',
  'Meeting Room adjacent to PPD',
  'Chhoesham',
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

  // -----------------------------------------------------------------
  // DRAWER STATE
  // -----------------------------------------------------------------
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Meeting>({
    day: '',
    timeStart: '09:00',
    timeEnd: '10:00',
    title: '',
    location: '',
    division: '', // ✅ now empty, acts as placeholder
    department: '',
    stakeholders: '',
    description: '',
  });
  const [customLocation, setCustomLocation] = useState<string>('');
  const [stakeholderInput, setStakeholderInput] = useState<string>('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);

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
        } else {
          console.error('Failed to fetch departments');
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
  // FETCH THE MOST RECENT PLAN TO COPY TASKS & LEGEND
  // =========================================================
  useEffect(() => {
    const fetchPreviousPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/weekly-plans', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const plans: WeekPlan[] = await res.json();
          if (plans.length > 0) {
            const latest = plans.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            setTasks(latest.tasks || []);
            setLegendItems(latest.legend || []);
            console.log('✅ Copied tasks and legend from latest plan:', latest.weekLabel);
          } else {
            setTasks([]);
            setLegendItems([]);
          }
        }
      } catch (error) {
        console.error('Error fetching previous plan:', error);
        setTasks([]);
        setLegendItems([]);
      }
    };

    fetchPreviousPlan();
  }, []);

  // =========================================================
  // 3. AUTO-GENERATE WEEK LABEL
  // =========================================================
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startDay = start.getDate();
      const endDay = end.getDate();
      const monthName = start.toLocaleString('default', { month: 'long' });
      const yearNum = end.getFullYear();
      setWeekLabel(`Weekly Work Plan: ${startDay} - ${endDay} ${monthName}, ${yearNum}`);
    }
  }, [weekNumber, startDate, endDate]);

  // =========================================================
  // 4. MEETING CRUD OPERATIONS (with drawer)
  // =========================================================

  const openDrawerForAdd = (day: string) => {
    setEditingIndex(null);
    setFormData({
      day: day,
      timeStart: '09:00',
      timeEnd: '10:00',
      title: '',
      location: '',
      division: '', // ✅ empty – placeholder
      department: '',
      stakeholders: '',
      description: '',
    });
    setCustomLocation('');
    setStakeholderInput('');
    setDrawerOpen(true);
  };

  const openDrawerForEdit = (index: number) => {
    const meeting = meetings[index];
    setEditingIndex(index);
    setFormData({ ...meeting });
    if (meeting.location && !LOCATION_OPTIONS.includes(meeting.location)) {
      setCustomLocation(meeting.location);
    } else {
      setCustomLocation('');
    }
    setStakeholderInput('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingIndex(null);
  };

  const saveMeetingFromDrawer = () => {
    let finalLocation = formData.location;
    if (formData.location === 'Others') {
      finalLocation = customLocation || '';
    }

    const newMeeting: Meeting = {
      ...formData,
      location: finalLocation,
    };

    // ✅ Validation: Title and Division (Meeting type) are required
    if (!newMeeting.title.trim()) {
      alert('Meeting title is required.');
      return;
    }
    if (!newMeeting.division) {
      alert('Meeting type is required.');
      return;
    }

    if (editingIndex !== null) {
      const updated = [...meetings];
      updated[editingIndex] = newMeeting;
      setMeetings(updated);
    } else {
      setMeetings([...meetings, newMeeting]);
    }
    closeDrawer();
  };

  const deleteMeetingFromDrawer = () => {
    if (editingIndex === null) return;
    if (!window.confirm('Delete this meeting?')) return;
    const updated = meetings.filter((_, i) => i !== editingIndex);
    setMeetings(updated);
    closeDrawer();
  };

  const cloneMeeting = (index: number) => {
    const meeting = meetings[index];
    const cloned: Meeting = { ...meeting, title: meeting.title + ' (Copy)' };
    const updated = [...meetings];
    updated.splice(index + 1, 0, cloned);
    setMeetings(updated);
  };

  const deleteMeetingFromCard = (index: number) => {
    if (!window.confirm('Delete this meeting?')) return;
    const updated = meetings.filter((_, i) => i !== index);
    setMeetings(updated);
  };

  const handleFormChange = (field: keyof Meeting, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleLocationChange = (value: string) => {
    setFormData({ ...formData, location: value });
    if (value !== 'Others') {
      setCustomLocation('');
    }
  };

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

  const getStakeholderArray = (stakeholdersStr: string): string[] => {
    if (!stakeholdersStr) return [];
    return stakeholdersStr.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const addStakeholder = () => {
    const current = getStakeholderArray(formData.stakeholders);
    const newStakeholder = stakeholderInput.trim();
    if (!newStakeholder) return;
    if (current.includes(newStakeholder)) {
      alert('Stakeholder already added.');
      return;
    }
    const updated = [...current, newStakeholder];
    setFormData({ ...formData, stakeholders: updated.join(', ') });
    setStakeholderInput('');
  };

  const removeStakeholder = (stakeholderToRemove: string) => {
    const current = getStakeholderArray(formData.stakeholders);
    const updated = current.filter((s) => s !== stakeholderToRemove);
    setFormData({ ...formData, stakeholders: updated.join(', ') });
  };

  // =========================================================
  // 5. TASKS & LEGEND HANDLERS
  // =========================================================
  const [tasks, setTasks] = useState<string[]>([]);
  const [legendItems, setLegendItems] = useState<{ key: string; value: string }[]>([]);

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

  // =========================================================
  // 6. SUBMIT
  // =========================================================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

      const filteredTasks = tasks.filter((t) => t.trim() !== '');
      const filteredLegend = legendItems.filter(
        (item) => item.key.trim() !== '' && item.value.trim() !== ''
      );

      const planData = {
        weekNumber,
        year,
        startDate,
        endDate,
        weekLabel,
        meetings,
        tasks: filteredTasks,
        legend: filteredLegend,
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
    setTasks([]);
    setLegendItems([]);
    setDrawerOpen(false);
    setEditingIndex(null);
  };

  // =========================================================
  // RENDER
  // =========================================================
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
            <Text size="1" color="gray" mt="1">
              💡 Tasks and Legend are automatically copied from the most recent plan.
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
                <Badge variant="soft" color="blue">✏️ Draft Mode</Badge>
                {generatedLink && <Badge variant="solid" color="green">✅ Plan Created</Badge>}
              </Flex>

              <Separator size="4" />

              {/* Plan Details Grid */}
              <div className="grid md:grid-cols-5 gap-4 items-end">
                <Box>
                  <Text as="label" size="2" weight="medium">Week Number</Text>
                  <TextField.Root
                    type="number"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    required
                    min={1}
                    max={53}
                    mt="1"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">Year</Text>
                  <TextField.Root
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    required
                    min={2020}
                    max={2030}
                    mt="1"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">Start Date</Text>
                  <TextField.Root
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    mt="1"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">End Date</Text>
                  <TextField.Root
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    mt="1"
                  />
                </Box>
                <Box>
                  <Text as="label" size="2" weight="medium">Week Label</Text>
                  <TextField.Root
                    value={weekLabel}
                    readOnly
                    mt="1"
                    style={{ background: '#f3f4f6' }}
                  />
                  <Text size="1" color="gray" mt="1">Auto-generated from dates</Text>
                </Box>
              </div>

              <Separator size="4" />

              {/* Meetings Section */}
              <Flex align="center" justify="between">
                <Box>
                  <Text size="3" weight="bold">📋 Meetings</Text>
                  <Text size="2" color="gray">Total: {meetings.length} meetings</Text>
                </Box>
              </Flex>

              {/* 7-Day Grid - COMPACT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start">
                {DAYS.map((day) => {
                  const dayMeetings = meetings
                    .filter((m) => m.day === day)
                    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
                  const hasMeetings = dayMeetings.length > 0;
                  const dateDisplay = startDate ? getDateForDay(startDate, day) : '';

                  return (
                    <div
                      key={day}
                      className={`border border-slate-200 rounded-lg p-3 bg-slate-50 ${
                        hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <Text weight="bold" size="2">{day}</Text>
                          <Text size="1" color="gray" className="block">{dateDisplay}</Text>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="1"
                          onClick={() => openDrawerForAdd(day)}
                          className="flex-shrink-0"
                          title="Add meeting"
                        >
                          <FaPlus size={12} />
                        </Button>
                      </div>

                      {/* Meeting Cards - Compact */}
                      <div className="space-y-2">
                        {dayMeetings.map((meeting, index) => {
                          const realIndex = meetings.indexOf(meeting);
                          return (
                            <div
                              key={`${day}-${realIndex}`}
                              className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                              style={{
                                borderLeft: `4px solid ${DIVISION_COLORS[meeting.division] || '#888'}`,
                              }}
                              onClick={() => openDrawerForEdit(realIndex)}
                            >
                              {/* Time */}
                              <div className="flex items-center justify-between">
                                <Text size="2" weight="bold">
                                  {meeting.timeStart} - {meeting.timeEnd}
                                </Text>
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
                                      deleteMeetingFromCard(realIndex);
                                    }}
                                    className="text-red-400 hover:text-red-600 text-xs p-1"
                                    title="Delete meeting"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Title */}
                              <Text size="2" weight="medium" className="mt-0.5">
                                {meeting.title || '(Untitled)'}
                              </Text>

                              {/* Division */}
                              <Text size="1" color="gray">
                                🏢 {meeting.division}
                              </Text>

                              {/* Location (if any) */}
                              {meeting.location && (
                                <Text size="1" color="gray">
                                  📍 {meeting.location}
                                </Text>
                              )}

                              {/* Departments (badges) */}
                              {meeting.department && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meeting.department.split(',').map((d) => (
                                    <Badge key={d.trim()} variant="soft" color="blue" size="1">
                                      {d.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Stakeholders (purple badges) */}
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

              {/* ========================================================= */}
              {/* TASKS & LEGEND SECTIONS (unchanged) */}
              {/* ========================================================= */}
              <Separator size="4" />

              <Box>
                <Flex align="center" justify="between" mb="2">
                  <Box>
                    <Text size="3" weight="bold">📌 Week-long Tasks</Text>
                    <Text size="2" color="gray">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    </Text>
                  </Box>
                  <Button type="button" variant="soft" onClick={addTask}>
                    <FaPlus /> Add Task
                  </Button>
                </Flex>
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
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
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <Text size="2" color="gray" align="center" className="py-2">
                      No tasks added yet. Click "Add Task" to create one.
                    </Text>
                  )}
                </div>
              </Box>

              <Box>
                <Flex align="center" justify="between" mb="2">
                  <Box>
                    <Text size="3" weight="bold">📖 Legend</Text>
                    <Text size="2" color="gray">
                      {legendItems.length} item{legendItems.length !== 1 ? 's' : ''}
                    </Text>
                  </Box>
                  <Button type="button" variant="soft" onClick={addLegendItem}>
                    <FaPlus /> Add Legend Entry
                  </Button>
                </Flex>
                <div className="space-y-2">
                  {legendItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
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
                    </div>
                  ))}
                  {legendItems.length === 0 && (
                    <Text size="2" color="gray" align="center" className="py-2">
                      No legend entries added yet. Click "Add Legend Entry" to create one.
                    </Text>
                  )}
                </div>
              </Box>

              <Separator size="4" />

              {/* Form Actions */}
              <Flex gap="3" pt="2" wrap="wrap" align="center">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : '📤 Create Week Plan'}
                </Button>
                <Button type="button" variant="soft" color="gray" onClick={handleReset}>
                  Reset
                </Button>
                {generatedLink && (
                  <Box>
                    <Badge color="green" size="2">✅ Plan Created!</Badge>
                    <Text size="1" color="gray" ml="2">Link: {generatedLink}</Text>
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
                      if (res.ok) alert('✅ Email notification sent! (PLACEHOLDER)');
                      else alert('❌ Failed to send email');
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

      {/* ========================================================= */}
      {/* SLIDE-IN DRAWER (Right Panel) – Updated with placeholders */}
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

                {/* Title – No label, placeholder only */}
                <div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Meeting title"
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Location – No label, select with placeholder option (disabled, gray) */}
                <div>
                  <select
                    value={formData.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="" disabled className="text-slate-400">
                      Meeting Venue
                    </option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {formData.location === 'Others' && (
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Enter custom venue..."
                      className="w-full border-2 border-blue-300 rounded px-3 py-2 mt-2 bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  )}
                </div>

                {/* Meeting Type – No label, select with placeholder option (disabled, gray) */}
                <div>
                  <select
                    value={formData.division}
                    onChange={(e) => handleFormChange('division', e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="" disabled className="text-slate-400">
                      Meeting type
                    </option>
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Departments – Label changed to "Internal Attendees" */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Internal Attendees
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

                {/* Stakeholders – No label, placeholder changed */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={stakeholderInput}
                      onChange={(e) => setStakeholderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStakeholder();
                        }
                      }}
                      placeholder="External Attendees"
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

                {/* Action Buttons */}
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