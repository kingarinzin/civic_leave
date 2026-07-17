"use client";

import React, { FormEvent, useEffect, useState, useRef } from 'react';
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

  const [customLocation, setCustomLocation] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<string[]>([]);
  const [legendItems, setLegendItems] = useState<{ key: string; value: string }[]>([]);
  const [stakeholderInput, setStakeholderInput] = useState<Record<string, string>>({});

  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);

  const [expandedMeetingIndex, setExpandedMeetingIndex] = useState<number | null>(null);
  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // =========================================================
  // 1. FETCH DEPARTMENTS
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
  // 2. FETCH THE MOST RECENT PLAN TO COPY TASKS & LEGEND
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
  // 3. AUTO-GENERATE WEEK LABEL – UPDATED FORMAT
  // =========================================================
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startDay = start.getDate();
      const endDay = end.getDate();
      const monthName = start.toLocaleString('default', { month: 'long' }); // e.g., "July"
      const yearNum = end.getFullYear();
      setWeekLabel(`Weekly Work Plan: ${startDay} - ${endDay} ${monthName}, ${yearNum}`);
    }
  }, [weekNumber, startDate, endDate]);

  // =========================================================
  // 4. MEETING CRUD
  // =========================================================

  // --- Location Handlers ---
  const getLocationDisplay = (meeting: Meeting): string => {
    const meetingId = meeting._id || `temp-${meetings.indexOf(meeting)}`;
    if (customLocation[meetingId] !== undefined) return 'Others';
    if (meeting.location && LOCATION_OPTIONS.includes(meeting.location)) return meeting.location;
    return '';
  };

  const handleLocationChange = (index: number, value: string): void => {
    const meetingId = meetings[index]._id || `temp-${index}`;
    if (value === 'Others') {
      const existingCustom = customLocation[meetingId] || '';
      setCustomLocation((prev) => ({ ...prev, [meetingId]: existingCustom }));
      const updated = [...meetings];
      updated[index] = { ...updated[index], location: '' };
      setMeetings(updated);
    } else {
      const updated = [...meetings];
      updated[index] = { ...updated[index], location: value };
      setMeetings(updated);
      const newCustom = { ...customLocation };
      delete newCustom[meetingId];
      setCustomLocation(newCustom);
    }
  };

  const handleCustomLocationChange = (index: number, value: string): void => {
    const meetingId = meetings[index]._id || `temp-${index}`;
    setCustomLocation((prev) => ({ ...prev, [meetingId]: value }));
  };

  // --- Department Handlers (Multi-Select) ---
  const getDepartmentArray = (meeting: Meeting): string[] => {
    if (!meeting.department) return [];
    return meeting.department.split(',').map((d) => d.trim()).filter(Boolean);
  };

  const handleDepartmentChange = (index: number, selectedValues: string[]): void => {
    const updated = [...meetings];
    updated[index] = { ...updated[index], department: selectedValues.join(', ') };
    setMeetings(updated);
  };

  const removeDepartmentFromMeeting = (index: number, departmentToRemove: string): void => {
    const currentDepartments = getDepartmentArray(meetings[index]);
    const updatedDepartments = currentDepartments.filter((d) => d !== departmentToRemove);
    const updated = [...meetings];
    updated[index] = { ...updated[index], department: updatedDepartments.join(', ') };
    setMeetings(updated);
  };

  // --- Stakeholder Handlers ---
  const getStakeholderArray = (meeting: Meeting): string[] => {
    if (!meeting.stakeholders) return [];
    return meeting.stakeholders.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const addStakeholder = (index: number): void => {
    const meetingId = meetings[index]._id || `temp-${index}`;
    const inputValue = stakeholderInput[meetingId] || '';
    if (!inputValue.trim()) return;

    const currentStakeholders = getStakeholderArray(meetings[index]);
    if (currentStakeholders.includes(inputValue.trim())) {
      alert('Stakeholder already added');
      return;
    }

    const updatedStakeholders = [...currentStakeholders, inputValue.trim()];
    const updated = [...meetings];
    updated[index] = { ...updated[index], stakeholders: updatedStakeholders.join(', ') };
    setMeetings(updated);
    setStakeholderInput((prev) => ({ ...prev, [meetingId]: '' }));
  };

  const handleStakeholderInputChange = (index: number, value: string): void => {
    const meetingId = meetings[index]._id || `temp-${index}`;
    setStakeholderInput((prev) => ({ ...prev, [meetingId]: value }));
  };

  const handleStakeholderKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStakeholder(index);
    }
  };

  const removeStakeholder = (index: number, stakeholderToRemove: string): void => {
    const currentStakeholders = getStakeholderArray(meetings[index]);
    const updatedStakeholders = currentStakeholders.filter((s) => s !== stakeholderToRemove);
    const updated = [...meetings];
    updated[index] = { ...updated[index], stakeholders: updatedStakeholders.join(', ') };
    setMeetings(updated);
  };

  // --- Meeting CRUD ---
  const addMeeting = (day: string): void => {
    // ✅ Title is now empty – shows placeholder only
    const newMeeting: Meeting = {
      day: day,
      timeStart: '09:00',
      timeEnd: '10:00',
      title: '',
      location: '',
      division: 'Administration',
      department: '',
      stakeholders: '',
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

  // =========================================================
  // 5. TASKS & LEGEND HANDLERS
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
  // 6. HANDLE CLICK OUTSIDE TO COLLAPSE
  // =========================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedMeetingIndex !== null) {
        const ref = cardRefs.current[expandedMeetingIndex];
        if (ref && !ref.contains(event.target as Node)) {
          setExpandedMeetingIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedMeetingIndex]);

  // =========================================================
  // 7. SUBMIT
  // =========================================================
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

      const meetingsWithCustom = meetings.map((meeting, index) => {
        const meetingId = meeting._id || `temp-${index}`;
        let updated = { ...meeting };
        if (customLocation[meetingId] !== undefined) {
          updated.location = customLocation[meetingId];
        }
        return updated;
      });

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
        meetings: meetingsWithCustom,
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
    setCustomLocation({});
    setStakeholderInput({});
    setTasks([]);
    setLegendItems([]);
    setExpandedMeetingIndex(null);
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

              {/* 7-Day Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start">
                {DAYS.map((day) => {
                  const dayMeetings = getMeetingsForDay(day);
                  const hasMeetings = dayMeetings.length > 0;
                  const dateDisplay = startDate ? getDateForDay(startDate, day) : '';

                  return (
                    <div
                      key={day}
                      className={`border border-slate-200 rounded-lg p-3 bg-slate-50 ${
                        hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                      }`}
                    >
                      {/* Day Header with Date */}
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <Text weight="bold" size="2">
                            {day}
                          </Text>
                          <Text size="1" color="gray" className="block">
                            {dateDisplay}
                          </Text>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="1"
                          onClick={() => addMeeting(day)}
                          className="flex-shrink-0"
                        >
                          <FaPlus size={12} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {dayMeetings.map((meeting, index) => {
                          const realIndex = meetings.indexOf(meeting);
                          const meetingId = meeting._id || `temp-${realIndex}`;
                          const departmentArray = getDepartmentArray(meeting);
                          const stakeholderArray = getStakeholderArray(meeting);
                          const isExpanded = expandedMeetingIndex === realIndex;

                          return (
                            <div
                              key={`${day}-${realIndex}`}
                              ref={(el) => {
                                cardRefs.current[realIndex] = el;
                              }}
                              onClick={() => {
                                setExpandedMeetingIndex(
                                  expandedMeetingIndex === realIndex ? null : realIndex
                                );
                              }}
                              className={`
                                meeting-card bg-white border border-slate-200 rounded-lg p-2 shadow-sm 
                                transition-all duration-200 cursor-pointer
                                ${isExpanded ? 'border-2 border-blue-400 shadow-lg scale-105 z-10 bg-white' : 'hover:shadow-md'}
                              `}
                              style={{
                                borderLeft: `4px solid ${DIVISION_COLORS[meeting.division] || '#888'}`,
                              }}
                            >
                              {isExpanded ? (
                                // =========================================================
                                // EXPANDED STATE - Larger inputs
                                // =========================================================
                                <>
                                  {/* Time */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-xs font-medium text-slate-600 w-12">Time:</label>
                                    <input
                                      type="time"
                                      value={meeting.timeStart}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'timeStart', e.target.value)
                                      }
                                      className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                    <span className="text-sm">-</span>
                                    <input
                                      type="time"
                                      value={meeting.timeEnd}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'timeEnd', e.target.value)
                                      }
                                      className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>

                                  {/* Title */}
                                  <div className="mb-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-0.5">Title *</label>
                                    <input
                                      value={meeting.title}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'title', e.target.value)
                                      }
                                      placeholder="Enter meeting title..."
                                      className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>

                                  {/* Location */}
                                  <div className="mb-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-0.5">Location</label>
                                    <select
                                      value={getLocationDisplay(meeting)}
                                      onChange={(e) =>
                                        handleLocationChange(realIndex, e.target.value)
                                      }
                                      className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    >
                                      <option value="">No Location</option>
                                      {LOCATION_OPTIONS.map((loc) => (
                                        <option key={loc} value={loc}>{loc}</option>
                                      ))}
                                    </select>
                                    {getLocationDisplay(meeting) === 'Others' && (
                                      <input
                                        type="text"
                                        value={customLocation[meetingId] || ''}
                                        onChange={(e) =>
                                          handleCustomLocationChange(realIndex, e.target.value)
                                        }
                                        placeholder="Enter custom location..."
                                        className="w-full text-sm border-2 border-blue-300 rounded px-3 py-2 mt-1 bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        autoFocus
                                      />
                                    )}
                                  </div>

                                  {/* Division */}
                                  <div className="mb-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-0.5">Meeting Type</label>
                                    <select
                                      value={meeting.division}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'division', e.target.value)
                                      }
                                      className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    >
                                      {DIVISIONS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Departments */}
                                  <div className="mb-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-0.5">
                                      Departments (hold Ctrl/Cmd to select multiple)
                                    </label>
                                    <select
                                      multiple
                                      value={departmentArray}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                                        handleDepartmentChange(realIndex, selected);
                                      }}
                                      className="w-full text-sm border border-slate-300 rounded px-3 py-2 min-h-[60px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                      size={3}
                                    >
                                      {departmentsLoading ? (
                                        <option value="" disabled>Loading departments...</option>
                                      ) : departments.length === 0 ? (
                                        <option value="" disabled>No departments found</option>
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
                                              onClick={() => removeDepartmentFromMeeting(realIndex, dept)}
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

                                  {/* Stakeholders */}
                                  <div className="mb-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-0.5">Stakeholders (External)</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={stakeholderInput[meetingId] || ''}
                                        onChange={(e) =>
                                          handleStakeholderInputChange(realIndex, e.target.value)
                                        }
                                        onKeyDown={(e) => handleStakeholderKeyDown(realIndex, e)}
                                        placeholder="Type stakeholder name..."
                                        className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => addStakeholder(realIndex)}
                                        className="px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold flex items-center justify-center"
                                        title="Add stakeholder"
                                      >
                                        <FaPlus size={12} className="mr-1" /> Add
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
                                              onClick={() => removeStakeholder(realIndex, stakeholder)}
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

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => cloneMeeting(realIndex)}
                                      className="text-slate-500 hover:text-slate-700 text-sm px-3 py-1 rounded hover:bg-slate-100"
                                      title="Clone meeting"
                                    >
                                      <FaCopy className="inline mr-1" /> Clone
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteMeeting(realIndex)}
                                      className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded hover:bg-red-50 ml-auto"
                                      title="Delete meeting"
                                    >
                                      <FaTrash className="inline mr-1" /> Delete
                                    </button>
                                  </div>
                                </>
                              ) : (
                                // =========================================================
                                // COLLAPSED STATE - Compact view
                                // =========================================================
                                <>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="time"
                                      value={meeting.timeStart}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'timeStart', e.target.value)
                                      }
                                      className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-xs">-</span>
                                    <input
                                      type="time"
                                      value={meeting.timeEnd}
                                      onChange={(e) =>
                                        updateMeeting(realIndex, 'timeEnd', e.target.value)
                                      }
                                      className="w-[65px] text-xs border border-slate-200 rounded px-1 py-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  {/* ✅ Title input now shows placeholder only – no default text */}
                                  <input
                                    value={meeting.title}
                                    onChange={(e) =>
                                      updateMeeting(realIndex, 'title', e.target.value)
                                    }
                                    placeholder="Meeting Title *"
                                    className="w-full text-sm font-medium border border-slate-200 rounded px-2 py-0.5 mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  />

                                  <div className="mt-1">
                                    <select
                                      value={getLocationDisplay(meeting)}
                                      onChange={(e) =>
                                        handleLocationChange(realIndex, e.target.value)
                                      }
                                      className="w-full text-xs border border-slate-200 rounded px-1 py-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="">No Location</option>
                                      {LOCATION_OPTIONS.map((loc) => (
                                        <option key={loc} value={loc}>{loc}</option>
                                      ))}
                                    </select>

                                    {getLocationDisplay(meeting) === 'Others' && (
                                      <input
                                        type="text"
                                        value={customLocation[meetingId] || ''}
                                        onChange={(e) =>
                                          handleCustomLocationChange(realIndex, e.target.value)
                                        }
                                        placeholder="Enter custom location..."
                                        className="w-full text-xs border-2 border-blue-300 rounded px-2 py-0.5 mt-1 bg-blue-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                      />
                                    )}
                                  </div>

                                  <select
                                    value={meeting.division}
                                    onChange={(e) =>
                                      updateMeeting(realIndex, 'division', e.target.value)
                                    }
                                    className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {DIVISIONS.map((d) => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>

                                  <div className="mt-1">
                                    <label className="text-xs text-slate-500 block mb-0.5">
                                      Departments (hold Ctrl/Cmd)
                                    </label>
                                    <select
                                      multiple
                                      value={departmentArray}
                                      onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                                        handleDepartmentChange(realIndex, selected);
                                      }}
                                      className="w-full text-xs border border-slate-200 rounded px-1 py-0.5 min-h-[50px]"
                                      size={2}
                                      onClick={(e) => e.stopPropagation()}
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
                                              onClick={() => removeDepartmentFromMeeting(realIndex, dept)}
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

                                  <div className="mt-1">
                                    <label className="text-xs text-slate-500 block mb-0.5">Stakeholders</label>
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        value={stakeholderInput[meetingId] || ''}
                                        onChange={(e) =>
                                          handleStakeholderInputChange(realIndex, e.target.value)
                                        }
                                        onKeyDown={(e) => handleStakeholderKeyDown(realIndex, e)}
                                        placeholder="Type stakeholder..."
                                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-0.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => addStakeholder(realIndex)}
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
                                              onClick={() => removeStakeholder(realIndex, stakeholder)}
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

                                  <div className="flex flex-wrap items-center gap-1 mt-1">
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
                                        deleteMeeting(realIndex);
                                      }}
                                      className="text-red-400 hover:text-red-600 text-xs p-1 ml-auto"
                                      title="Delete meeting"
                                    >
                                      <FaTrash size={12} />
                                    </button>
                                  </div>
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

              <Separator size="4" />

              {/* TASKS SECTION */}
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

              {/* LEGEND SECTION */}
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
    </div>
  );
}