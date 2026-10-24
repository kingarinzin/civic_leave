"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AbbrBadge from '@/components/AbbrBadge';
import { abbrDept, abbrDiv } from '@/lib/abbreviations';
import {
  DAYS,
  DIVISIONS_BASE as DIVISIONS,
  LOCATION_OPTIONS,
  DIVISION_COLORS,
} from '@/lib/weekly-plan-constants';
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
import { FaArrowLeft, FaEdit, FaSave, FaTrash, FaCopy, FaPlus, FaTimes, FaSearch, FaChevronDown, FaGripVertical } from 'react-icons/fa';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  divisionName: string;
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

// =========================================================
// SORTABLE ROW WRAPPER
// ---------------------------------------------------------
// Wraps a row (Legend entry or Task) and makes it draggable
// via a grip handle on the left. Only the handle initiates
// drag, so inputs inside the row remain clickable normally.
// =========================================================
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${
        isDragging ? 'bg-slate-100 rounded shadow-sm' : ''
      }`}
    >
      {/* Drag handle — the only element that initiates the drag */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing p-1 touch-none"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <FaGripVertical size={12} />
      </button>

      {children}
    </div>
  );
}

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
    return n + (v % 10 === 1 && v !== 11 ? s[1] : v % 10 === 2 && v !== 12 ? s[2] : v % 10 === 3 && v !== 13 ? s[3] : s[0]);
  };
  return `${ordinal(day)} ${month}`;
}

// =========================================================
// SEARCHABLE DROPDOWN COMPONENTS
// =========================================================

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

function SearchableMultiSelect({
  selected,
  onChange,
  options,
  placeholder,
  className,
  abbrResolver,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
  options: string[];
  placeholder: string;
  className?: string;
  abbrResolver?: (name: string) => string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState<string[]>(selected);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCancel = () => {
    setPendingSelected(selected);
    setIsOpen(false);
  };

  const handleDone = () => {
    onChange(pendingSelected);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          setPendingSelected(selected);
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, selected]);

  const handleOpen = () => {
    setPendingSelected(selected);
    setIsOpen(true);
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    if (pendingSelected.includes(opt)) {
      setPendingSelected(pendingSelected.filter((s) => s !== opt));
    } else {
      setPendingSelected([...pendingSelected, opt]);
    }
  };

  const removeOption = (opt: string) => {
    onChange(selected.filter((s) => s !== opt));
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((s) => (
            <AbbrBadge
              key={s}
              name={s}
              abbr={(abbrResolver ?? ((x: string) => x))(s)}
              color="blue"
            >
              <button
                type="button"
                onClick={() => removeOption(s)}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
              >
                ✕
              </button>
            </AbbrBadge>
          ))}
        </div>
      )}

      <div
        className="flex items-center border border-slate-300 rounded px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 cursor-text"
        onClick={handleOpen}
      >
        <FaSearch className="text-slate-400 mr-2 flex-shrink-0" size={14} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) handleOpen();
          }}
          onFocus={handleOpen}
          placeholder={selected.length > 0 ? '' : placeholder}
          className="flex-1 outline-none bg-transparent text-sm"
        />
        <FaChevronDown
          className={`text-slate-400 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={12}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No options found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                    pendingSelected.includes(opt)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-700'
                  }`}
                  onClick={() => toggleOption(opt)}
                >
                  <input
                    type="checkbox"
                    checked={pendingSelected.includes(opt)}
                    onChange={() => {}}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  {opt}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              {pendingSelected.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
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

  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState<boolean>(true);

  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [isSendingMassEmail, setIsSendingMassEmail] = useState<boolean>(false);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAllDay, setIsAllDay] = useState<boolean>(false);

  const [isExternalVenue, setIsExternalVenue] = useState<boolean>(false);

  const [formData, setFormData] = useState<Meeting>({
    _id: '',
    day: '',
    timeStart: '',
    timeEnd: '',
    title: '',
    location: '',
    division: '',
    department: '',
    divisionName: '',
    stakeholders: '',
    description: '',
  });

  const [timeStart12, setTimeStart12] = useState({ hour: 9, minute: '00', ampm: 'AM' });
  const [timeEnd12, setTimeEnd12] = useState({ hour: 10, minute: '00', ampm: 'AM' });

  const [stakeholderInputDrawer, setStakeholderInputDrawer] = useState<string>('');

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [showCustomDepartment, setShowCustomDepartment] = useState<boolean>(false);
  const [customDepartmentInput, setCustomDepartmentInput] = useState<string>('');

  // =========================================================
  // DnD SENSORS
  // =========================================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      department: selectedDepartments.join(', '),
    }));
  }, [selectedDepartments]);

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
    const fetchDivisions = async () => {
      try {
        setDivisionsLoading(true);
        const res = await fetch('/api/divisions');
        if (res.ok) {
          const data = await res.json();
          const divisionNames = data.map((div: any) => div.name).filter(Boolean);
          setDivisions(divisionNames);
        }
      } catch (error) {
        console.error('Error fetching divisions:', error);
      } finally {
        setDivisionsLoading(false);
      }
    };
    fetchDivisions();
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
          meetings: plan.meetings,
          tasks: plan.tasks || [],
          legend: plan.legend || [],
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage('✅ Plan updated successfully!');
        setIsEditing(false);
        setPlan(result.plan);
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

  const openDrawerForAdd = (day: string) => {
    setEditingIndex(null);
    setIsAllDay(false);
    setIsExternalVenue(false);
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
      divisionName: '',
      stakeholders: '',
      description: '',
    });
    setSelectedDepartments([]);
    setShowCustomDepartment(false);
    setCustomDepartmentInput('');
    setStakeholderInputDrawer('');
    setDrawerOpen(true);
  };

  const openDrawerForEdit = (index: number) => {
    const meeting = plan!.meetings[index];
    setEditingIndex(index);
    const isAllDayMeeting = !meeting.timeStart || !meeting.timeEnd;
    setIsAllDay(isAllDayMeeting);
    setFormData({ ...meeting });

    const venueIsInternal = meeting.location && LOCATION_OPTIONS.includes(meeting.location);
    setIsExternalVenue(!!meeting.location && !venueIsInternal);

    const depts = meeting.department ? meeting.department.split(',').map(s => s.trim()).filter(Boolean) : [];
    setSelectedDepartments(depts);
    setShowCustomDepartment(false);
    setCustomDepartmentInput('');
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
    setStakeholderInputDrawer('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingIndex(null);
  };

  const saveMeetingFromDrawer = () => {
    let start24 = '';
    let end24 = '';
    if (!isAllDay) {
      start24 = formatTimeTo24(timeStart12.hour, timeStart12.minute, timeStart12.ampm);
      end24 = formatTimeTo24(timeEnd12.hour, timeEnd12.minute, timeEnd12.ampm);
    }

    const newMeeting: Meeting = {
      ...formData,
      timeStart: start24,
      timeEnd: end24,
      department: selectedDepartments.join(', '),
    };

    if (!newMeeting.title.trim()) {
      alert('Meeting title is required.');
      return;
    }

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

  const deleteMeetingFromDrawer = () => {
    if (editingIndex === null) return;
    if (!window.confirm('Delete this meeting?')) return;
    const updatedMeetings = plan!.meetings.filter((_, i) => i !== editingIndex);
    setPlan({ ...plan!, meetings: updatedMeetings });
    closeDrawer();
  };

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

  const handleFormChange = (field: keyof Meeting, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const getDepartmentArray = (departmentsStr: string): string[] => {
    if (!departmentsStr) return [];
    return departmentsStr.split(',').map((d) => d.trim()).filter(Boolean);
  };

  const handleDepartmentSelect = (selected: string[]) => {
    const prev = selectedDepartments;
    const added = selected.find(s => !prev.includes(s));
    if (added === 'Others') {
      setShowCustomDepartment(true);
      setSelectedDepartments(prev);
      return;
    }
    setSelectedDepartments(selected);
  };

  const addCustomDepartment = () => {
    const val = customDepartmentInput.trim();
    if (!val) return;
    if (selectedDepartments.includes(val)) {
      alert('Department already added.');
      return;
    }
    setSelectedDepartments([...selectedDepartments, val]);
    setCustomDepartmentInput('');
  };

  const cancelCustomDepartment = () => {
    setShowCustomDepartment(false);
    setCustomDepartmentInput('');
  };

  const handleDivisionNameChange = (selected: string[]) => {
    setFormData({ ...formData, divisionName: selected.join(', ') });
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

  const addTask = () => {
    if (!plan) return;
    setPlan({ ...plan, tasks: [...(plan.tasks || []), ''] });
  };

  const updateTask = (index: number, value: string) => {
    if (!plan) return;
    const updated = [...(plan.tasks || [])];
    updated[index] = value;
    setPlan({ ...plan, tasks: updated });
  };

  const deleteTask = (index: number) => {
    if (!plan) return;
    if (!window.confirm('Delete this task?')) return;
    const updated = (plan.tasks || []).filter((_, i) => i !== index);
    setPlan({ ...plan, tasks: updated });
  };

  const addLegendItem = () => {
    if (!plan) return;
    setPlan({ ...plan, legend: [...(plan.legend || []), { key: '', value: '' }] });
  };

  const updateLegendItem = (index: number, field: 'key' | 'value', value: string) => {
    if (!plan) return;
    const updated = [...(plan.legend || [])];
    updated[index][field] = value;
    setPlan({ ...plan, legend: updated });
  };

  const deleteLegendItem = (index: number) => {
    if (!plan) return;
    if (!window.confirm('Delete this legend item?')) return;
    const updated = (plan.legend || []).filter((_, i) => i !== index);
    setPlan({ ...plan, legend: updated });
  };

  // =========================================================
  // DRAG-END HANDLERS
  // =========================================================
  const handleTaskDragEnd = (event: DragEndEvent) => {
    if (!plan) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const tasks = plan.tasks || [];
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (isNaN(oldIndex) || isNaN(newIndex)) return;

    setPlan({ ...plan, tasks: arrayMove(tasks, oldIndex, newIndex) });
  };

  const handleLegendDragEnd = (event: DragEndEvent) => {
    if (!plan) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const legend = plan.legend || [];
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (isNaN(oldIndex) || isNaN(newIndex)) return;

    setPlan({ ...plan, legend: arrayMove(legend, oldIndex, newIndex) });
  };

  const getMeetingsForDay = (day: string): Meeting[] => {
    if (!plan) return [];
    return plan.meetings
      .filter((m) => m.day === day)
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  };

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

              const grouped = dayMeetings.reduce((acc, meeting) => {
                const key = meeting.timeStart || 'All Day';
                if (!acc[key]) acc[key] = [];
                acc[key].push(meeting);
                return acc;
              }, {} as Record<string, Meeting[]>);

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
                    {Object.entries(grouped).map(([timeKey, meetingsInGroup]) => {
                      const count = meetingsInGroup.length;
                      const flexBasis = count > 1 ? `calc(${100 / count}% - 4px)` : '100%';

                      return (
                        <div key={timeKey} className="flex flex-wrap gap-1">
                          {meetingsInGroup.map((meeting) => {
                            const realIndex = plan.meetings.indexOf(meeting);
                            const displayTime = formatTimeDisplay(meeting.timeStart);
                            return (
                              <div
                                key={meeting._id}
                                className={`bg-white border border-slate-200 rounded-lg p-2 shadow-sm relative ${
                                  isEditing ? 'hover:shadow-md cursor-pointer' : ''
                                }`}
                                style={{
                                  flex: `0 0 ${flexBasis}`,
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

                                {meeting.division && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge
                                      variant="solid"
                                      size="1"
                                      style={{
                                        background: '#c9a227',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                      }}
                                    >
                                      Com
                                    </Badge>
                                  </div>
                                )}

                                {meeting.location && (
                                  <Text size="1" color="gray" className="block mt-0.5">
                                    📍 {meeting.location}
                                  </Text>
                                )}

                                {meeting.department && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {meeting.department.split(',').map((d) => {
                                      const full = d.trim();
                                      if (!full) return null;
                                      const abbr = abbrDept(full);
                                      if (abbr === 'Com') {
                                        return (
                                          <Badge
                                            key={full}
                                            variant="solid"
                                            size="1"
                                            title={full}
                                            style={{
                                              background: '#c9a227',
                                              color: 'white',
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              fontSize: '10px',
                                            }}
                                          >
                                            {abbr}
                                          </Badge>
                                        );
                                      }
                                      return (
                                        <AbbrBadge
                                          key={full}
                                          name={full}
                                          abbr={abbr}
                                          color="blue"
                                        />
                                      );
                                    })}
                                  </div>
                                )}

                                {meeting.divisionName && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {meeting.divisionName.split(',').map((d) => {
                                      const full = d.trim();
                                      if (!full) return null;
                                      return (
                                        <AbbrBadge
                                          key={full}
                                          name={full}
                                          abbr={abbrDiv(full)}
                                          color="green"
                                        />
                                      );
                                    })}
                                  </div>
                                )}

                                {meeting.stakeholders && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {meeting.stakeholders.split(',').map((s) => (
                                      <Badge
                                        key={s.trim()}
                                        variant="solid"
                                        size="1"
                                        style={{
                                          background: '#991b1b',
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

        <Card size="3" mt="4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <Flex align="center" justify="between" mb="2">
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">📌 Week-long Tasks</Text>
              <Badge variant="solid" color="orange" size="1">
                {plan.tasks?.length || 0}
              </Badge>
            </Flex>
            {isEditing && (
              <Button type="button" variant="soft" size="1" onClick={addTask}>
                <FaPlus /> Add Task
              </Button>
            )}
          </Flex>

          {isEditing ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTaskDragEnd}
            >
              <SortableContext
                items={(plan.tasks || []).map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {(plan.tasks || []).map((task, index) => (
                    <SortableRow key={index} id={String(index)}>
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
                    </SortableRow>
                  ))}
                  {(!plan.tasks || plan.tasks.length === 0) && (
                    <Text size="2" color="gray" align="center" className="py-2">
                      No tasks added yet. Click "Add Task" to create one.
                    </Text>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-1">
              {(plan.tasks || []).map((task, index) => (
                <Text key={index} size="2" className="text-slate-700 py-0.5 flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {task}
                </Text>
              ))}
              {(!plan.tasks || plan.tasks.length === 0) && (
                <Text size="2" color="gray" align="center" className="py-2">
                  No tasks added.
                </Text>
              )}
            </div>
          )}
        </Card>

        <Card size="3" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <Flex align="center" justify="between" mb="2">
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">📖 Legend</Text>
              <Badge variant="solid" color="blue" size="1">
                {plan.legend?.length || 0}
              </Badge>
            </Flex>
            {isEditing && (
              <Button type="button" variant="soft" size="1" onClick={addLegendItem}>
                <FaPlus /> Add Legend Entry
              </Button>
            )}
          </Flex>

          {isEditing ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLegendDragEnd}
            >
              <SortableContext
                items={(plan.legend || []).map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {(plan.legend || []).map((item, index) => (
                    <SortableRow key={index} id={String(index)}>
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
                    </SortableRow>
                  ))}
                  {(!plan.legend || plan.legend.length === 0) && (
                    <Text size="2" color="gray" align="center" className="py-2">
                      No legend entries added yet. Click "Add Legend Entry" to create one.
                    </Text>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(plan.legend || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 border border-slate-100">
                  <span className="font-medium text-slate-700">{item.key}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">{item.value}</span>
                </div>
              ))}
              {(!plan.legend || plan.legend.length === 0) && (
                <Text size="2" color="gray" align="center" className="py-2 col-span-full">
                  No legend entries.
                </Text>
              )}
            </div>
          )}
        </Card>

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

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/15 backdrop-blur-[2px] z-40 transition-opacity"
            onClick={closeDrawer}
          />
          <div className="fixed top-0 right-0 w-full sm:w-[500px] md:w-[550px] h-full bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out">
            <div className="p-6">
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

              <div className="space-y-4">
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

                <div>
                  <textarea
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Meeting title"
                    rows={2}
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-y"
                  />
                </div>

                <div>
                  <Text as="label" size="2" weight="medium" className="block mb-1">
                    Meeting Venue
                  </Text>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="externalVenueToggleEdit"
                      checked={isExternalVenue}
                      onChange={(e) => {
                        setIsExternalVenue(e.target.checked);
                        setFormData({ ...formData, location: '' });
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <Text as="label" htmlFor="externalVenueToggleEdit" size="2" weight="medium">
                      External venue (outside ACC)
                    </Text>
                  </div>

                  {isExternalVenue ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Enter venue name (outside ACC)..."
                      className="w-full border-2 border-amber-300 rounded px-3 py-2 bg-amber-50 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  ) : (
                    <SearchableSelect
                      value={formData.location}
                      onChange={(val) => setFormData({ ...formData, location: val })}
                      options={LOCATION_OPTIONS}
                      placeholder="Select internal venue"
                    />
                  )}
                </div>

                <div>
                  <SearchableSelect
                    value={formData.division}
                    onChange={(val) => handleFormChange('division', val)}
                    options={DIVISIONS}
                    placeholder="Meeting type"
                  />
                </div>

                <div>
                  <Text size="3" weight="bold" className="block mb-2">
                    Internal Attendees
                  </Text>

                  <div className="mb-3">
                    <Text as="label" size="2" weight="medium" className="block mb-1">
                      Department
                    </Text>
                    <SearchableMultiSelect
                      selected={selectedDepartments}
                      onChange={handleDepartmentSelect}
                      options={[...departments, 'Others']}
                      placeholder="Search departments..."
                      abbrResolver={abbrDept}
                    />
                    {departmentsLoading && (
                      <Text size="1" color="gray" className="mt-1">Loading departments...</Text>
                    )}
                    {showCustomDepartment && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={customDepartmentInput}
                          onChange={(e) => setCustomDepartmentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomDepartment();
                            }
                          }}
                          placeholder="Enter custom department..."
                          className="flex-1 border border-slate-300 rounded px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <Button type="button" size="1" onClick={addCustomDepartment}>
                          Add
                        </Button>
                        <Button type="button" size="1" variant="soft" color="gray" onClick={cancelCustomDepartment}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Text as="label" size="2" weight="medium" className="block mb-1">
                      Division
                    </Text>
                    <SearchableMultiSelect
                      selected={getDepartmentArray(formData.divisionName)}
                      onChange={handleDivisionNameChange}
                      options={divisions}
                      placeholder="Search divisions..."
                      abbrResolver={abbrDiv}
                    />
                    {divisionsLoading && (
                      <Text size="1" color="gray" className="mt-1">Loading divisions...</Text>
                    )}
                    {!divisionsLoading && divisions.length === 0 && (
                      <Text size="1" color="orange" className="mt-1">
                        No divisions found. Please add divisions in the system.
                      </Text>
                    )}
                  </div>
                </div>

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
                      className="flex-1 border border-slate-300 rounded px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                    <button
                      type="button"
                      onClick={addStakeholder}
                      className="px-4 py-2 rounded-full bg-red-700 hover:bg-red-800 text-white font-bold flex items-center justify-center"
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
                          size="1"
                          className="flex items-center gap-1"
                          style={{
                            background: '#991b1b',
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
                            className="text-white hover:text-red-200 rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none hover:bg-red-800"
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

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