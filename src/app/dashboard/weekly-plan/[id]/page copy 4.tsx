"use client";

import React, { useEffect, useState, useRef } from 'react';
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
import { FaArrowLeft, FaEdit, FaSave, FaTrash, FaCopy, FaPlus, FaTimes, FaSearch, FaChevronDown } from 'react-icons/fa';

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

// ============================================
// CONSTANTS (updated to match Add page)
// ============================================
const DAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

// =========================================================
// TIME HELPER FUNCTIONS
// =========================================================
function parseTimeTo12(time24: string): { hour: number; minute: string; ampm: string } {
  if (!time24) return { hour: 9, minute: '00', ampm: 'AM' };
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { hour: hour12, minute: String(m).padStart(2, '0'), ampm };
}

function formatTimeTo24(hour: number, minute: string, ampm: string): string {
  let h = hour;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

function formatTimeDisplay(time: string): string {
  if (!time) return 'All Day';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

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

// =========================================================
// SEARCHABLE DROPDOWN COMPONENTS (same as Add page)
// =========================================================

// Single-select searchable dropdown
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div
        className="flex items-center border border-slate-300 rounded px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 cursor-text"
        onClick={() => setIsOpen(true)}
      >
        <FaSearch className="text-slate-400 mr-2 flex-shrink-0" size={14} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value || placeholder}
          className="flex-1 outline-none bg-transparent text-sm"
        />
        <FaChevronDown
          className={`text-slate-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={12}
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No options found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${value === opt ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'}`}
                onClick={() => {
                  onChange(opt);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Multi-select searchable dropdown (for Internal Attendees)
function SearchableMultiSelect({
  selected,
  onChange,
  options,
  placeholder,
  className,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const removeOption = (opt: string) => {
    onChange(selected.filter((s) => s !== opt));
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((s) => (
            <Badge
              key={s}
              variant="soft"
              color="blue"
              size="1"
              className="flex items-center gap-1"
            >
              {s}
              <button
                type="button"
                onClick={() => removeOption(s)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
              >
                ✕
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div
        className="flex items-center border border-slate-300 rounded px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 cursor-text"
        onClick={() => setIsOpen(true)}
      >
        <FaSearch className="text-slate-400 mr-2 flex-shrink-0" size={14} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selected.length > 0 ? '' : placeholder}
          className="flex-1 outline-none bg-transparent text-sm"
        />
        <FaChevronDown
          className={`text-slate-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={12}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No options found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                  selected.includes(opt) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                }`}
                onClick={() => toggleOption(opt)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
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
  // DRAWER STATE (enhanced)
  // =========================================================
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAllDay, setIsAllDay] = useState<boolean>(false);

  const [formData, setFormData] = useState<Meeting>({
    _id: '',
    day: '',
    timeStart: '',
    timeEnd: '',
    title: '',
    location: '',
    division: '',
    department: '',
    stakeholders: '',
    description: '',
  });

  // 12-hour time selection state
  const [timeStart12, setTimeStart12] = useState({ hour: 9, minute: '00', ampm: 'AM' });
  const [timeEnd12, setTimeEnd12] = useState({ hour: 10, minute: '00', ampm: 'AM' });

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
    setIsAllDay(false);
    const defaultStart = { hour: 9, minute: '00', ampm: 'AM' };
    const defaultEnd = { hour: 10, minute: '00', ampm: 'AM' };
    setTimeStart12(defaultStart);
    setTimeEnd12(defaultEnd);
    setFormData({
      _id: '',
      day: day,
      timeStart: '',
      timeEnd: '',
      title: '',
      location: '',
      division: '',
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
    const isAllDayMeeting = !meeting.timeStart || !meeting.timeEnd;
    setIsAllDay(isAllDayMeeting);
    setFormData({ ...meeting });
    if (!isAllDayMeeting && meeting.timeStart) {
      const start12 = parseTimeTo12(meeting.timeStart);
      const end12 = parseTimeTo12(meeting.timeEnd);
      setTimeStart12(start12);
      setTimeEnd12(end12);
    } else {
      const defaultStart = { hour: 9, minute: '00', ampm: 'AM' };
      const defaultEnd = { hour: 10, minute: '00', ampm: 'AM' };
      setTimeStart12(defaultStart);
      setTimeEnd12(defaultEnd);
    }
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

  // Save meeting from drawer
  const saveMeetingFromDrawer = () => {
    let start24 = '';
    let end24 = '';
    if (!isAllDay) {
      start24 = formatTimeTo24(timeStart12.hour, timeStart12.minute, timeStart12.ampm);
      end24 = formatTimeTo24(timeEnd12.hour, timeEnd12.minute, timeEnd12.ampm);
    }

    let finalLocation = formData.location;
    if (formData.location === 'Others') {
      finalLocation = customLocationDrawer || '';
    }

    const newMeeting: Meeting = {
      ...formData,
      timeStart: start24,
      timeEnd: end24,
      location: finalLocation,
    };

    // Validate required fields
    if (!newMeeting.title.trim()) {
      alert('Meeting title is required.');
      return;
    }
    if (!newMeeting.division) {
      alert('Meeting type is required.');
      return;
    }

    // Update plan meetings
    const currentMeetings = plan!.meetings;
    let updatedMeetings;
    if (editingIndex !== null) {
      updatedMeetings = [...currentMeetings];
      updatedMeetings[editingIndex] = newMeeting;
    } else {
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
    if (meetingId.startsWith('temp-')) {
      const updated = plan!.meetings.filter((m) => m._id !== meetingId);
      setPlan({ ...plan!, meetings: updated });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weekly-plans/${id}?meetingId=${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setPlan(result.plan);
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
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
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
                      const displayTime = formatTimeDisplay(meeting.timeStart);
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
                              {displayTime}
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
      {/* SLIDE-IN DRAWER (Right Panel) – Enhanced with 12h & Searchable */}
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

                {/* All Day Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDayToggleEdit"
                    checked={isAllDay}
                    onChange={(e) => {
                      setIsAllDay(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, timeStart: '', timeEnd: '' });
                      } else {
                        setTimeStart12({ hour: 9, minute: '00', ampm: 'AM' });
                        setTimeEnd12({ hour: 10, minute: '00', ampm: 'AM' });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <Text as="label" htmlFor="allDayToggleEdit" size="2" weight="medium">
                    All Day
                  </Text>
                </div>

                {/* Time – 12-hour format (hidden when All Day) */}
                {!isAllDay && (
                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-1">
                      Time
                    </Text>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <select
                          value={timeStart12.hour}
                          onChange={(e) =>
                            setTimeStart12({ ...timeStart12, hour: Number(e.target.value) })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-slate-500">:</span>
                        <select
                          value={timeStart12.minute}
                          onChange={(e) =>
                            setTimeStart12({ ...timeStart12, minute: e.target.value })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={timeStart12.ampm}
                          onChange={(e) =>
                            setTimeStart12({ ...timeStart12, ampm: e.target.value })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                      <span className="text-slate-400">–</span>
                      <div className="flex-1 flex items-center gap-1">
                        <select
                          value={timeEnd12.hour}
                          onChange={(e) =>
                            setTimeEnd12({ ...timeEnd12, hour: Number(e.target.value) })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-slate-500">:</span>
                        <select
                          value={timeEnd12.minute}
                          onChange={(e) =>
                            setTimeEnd12({ ...timeEnd12, minute: e.target.value })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={timeEnd12.ampm}
                          onChange={(e) =>
                            setTimeEnd12({ ...timeEnd12, ampm: e.target.value })
                          }
                          className="w-16 border border-slate-300 rounded px-2 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Meeting Venue – Searchable */}
                <div>
                  <SearchableSelect
                    value={formData.location}
                    onChange={(val) => handleLocationChange(val)}
                    options={LOCATION_OPTIONS}
                    placeholder="Meeting Venue"
                  />
                  {formData.location === 'Others' && (
                    <input
                      type="text"
                      value={customLocationDrawer}
                      onChange={(e) => setCustomLocationDrawer(e.target.value)}
                      placeholder="Enter custom venue..."
                      className="w-full border-2 border-blue-300 rounded px-3 py-2 mt-2 bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  )}
                </div>

                {/* Meeting Type – Searchable */}
                <div>
                  <SearchableSelect
                    value={formData.division}
                    onChange={(val) => handleFormChange('division', val)}
                    options={DIVISIONS}
                    placeholder="Meeting type"
                  />
                </div>

                {/* Internal Attendees – Searchable Multi-Select */}
                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Internal Attendees
                  </Text>
                  <SearchableMultiSelect
                    selected={getDepartmentArray(formData.department)}
                    onChange={handleDepartmentChange}
                    options={departments}
                    placeholder="Search departments..."
                  />
                  {departmentsLoading && (
                    <Text size="1" color="gray" className="mt-1">Loading departments...</Text>
                  )}
                </div>

                {/* Stakeholders – No label, placeholder "External Attendees" */}
                <div>
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