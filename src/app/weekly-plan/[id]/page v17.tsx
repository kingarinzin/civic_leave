"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Box, Card, Flex, Heading, Text } from '@radix-ui/themes';

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

// ============================================
// CONSTANTS
// ============================================
const ALL_DAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
// Helper: Format time to 12-hour display
// =========================================================
function formatTimeDisplay(time: string): string {
  if (!time) return 'All Day';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// =========================================================
// Helper: Get formatted date for a given day
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
// Helper: Format a date range for display (e.g., "20 - 24 July, 2026")
// =========================================================
function formatDateRange(startDateStr: string, endDateStr: string): string {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.toLocaleString('default', { month: 'long' });
  const year = start.getFullYear();
  return `${startDay} - ${endDay} ${month}, ${year}`;
}

// =========================================================
// Helper: Determine if a meeting is in the morning
// =========================================================
function isMorningMeeting(meeting: Meeting): boolean {
  if (!meeting.timeStart) return true;
  const hour = parseInt(meeting.timeStart.split(':')[0], 10);
  return hour < 12;
}

// ============================================
// COMPONENT
// ============================================
export default function PublicWeeklyPlanView(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async (): Promise<void> => {
      try {
        setLoading(true);
        const res = await fetch(`/api/weekly-plans?id=${id}`);

        if (res.ok) {
          const data: WeekPlan = await res.json();
          setPlan(data);
        } else if (res.status === 404) {
          setError('Schedule not found');
        } else {
          setError('Failed to load schedule');
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
        setError('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlan();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card>
          <Text>Loading schedule...</Text>
        </Card>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card size="3" style={{ maxWidth: '500px', width: '100%' }}>
          <Flex direction="column" align="center" gap="3">
            <Text color="red" size="5">📅</Text>
            <Heading size="4">Schedule Not Available</Heading>
            <Text color="gray" size="2" align="center">
              {error || "The schedule you're looking for could not be found."}
            </Text>
            <Text size="1" color="gray">
              If you received this link via email, please contact the Planning Office.
            </Text>
          </Flex>
        </Card>
      </div>
    );
  }

  // Filter days: Show Saturday & Sunday ONLY if they have meetings
  const daysToShow = ALL_DAYS.filter((day) => {
    if (day === 'Saturday' || day === 'Sunday') {
      const hasMeetings = plan.meetings.some((m) => m.day === day);
      return hasMeetings;
    }
    return true;
  });

  const dateRange = formatDateRange(plan.startDate, plan.endDate);

  // For each day, get morning and afternoon meetings
  const dayData = daysToShow.map((day) => {
    const dayMeetings = plan.meetings
      .filter((m) => m.day === day)
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

    const morning = dayMeetings.filter(isMorningMeeting);
    const afternoon = dayMeetings.filter((m) => !isMorningMeeting(m));

    return { day, morning, afternoon };
  });

  // Group by timeStart for parallel display
  const groupByTime = (meetings: Meeting[]): Record<string, Meeting[]> => {
    return meetings.reduce<Record<string, Meeting[]>>((acc, meeting) => {
      const key = meeting.timeStart || 'All Day';
      if (!acc[key]) acc[key] = [];
      acc[key].push(meeting);
      return acc;
    }, {});
  };

  // Render meeting cards for a group – with parallel layout fix
  const renderMeetingGroup = (meetings: Meeting[]) => {
    const grouped = groupByTime(meetings);
    return Object.entries(grouped).map(([timeStart, meetingsInGroup]) => {
      const count = meetingsInGroup.length;
      const flexBasis = count > 1 ? `calc(${100 / count}% - 4px)` : '100%';
      const displayTime = formatTimeDisplay(timeStart);

      return (
        <div key={timeStart} className="border-b border-slate-100 pb-2 last:border-0">
          <Badge variant="soft" color="blue" className="mb-1" size="1">
            🕐 {displayTime}
          </Badge>
          <div className="flex flex-wrap gap-1">
            {meetingsInGroup.map((meeting) => (
              <div
                key={meeting._id}
                className="bg-slate-50 rounded p-2 border-l-4 flex-1 min-w-0 overflow-hidden"
                style={{
                  flex: `0 0 ${flexBasis}`,
                  borderLeftColor: DIVISION_COLORS[meeting.division] || '#888',
                  wordBreak: 'break-word',
                }}
              >
                <Text weight="bold" size="2">
                  {meeting.title}
                </Text>
                {meeting.location && (
                  <div className="text-xs text-slate-500">📍 {meeting.location}</div>
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
                {meeting.divisionName && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {meeting.divisionName.split(',').map((d) => (
                      <Badge key={d.trim()} variant="soft" color="green" size="1">
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
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full">
      <Card size="3" className="w-full max-w-full rounded-none shadow-none">
        {/* ========================================================= */}
        {/* HEADER */}
        {/* ========================================================= */}
        <div className="px-4 md:px-6 pt-4">
          <Flex align="center" justify="between" mb="2" wrap="wrap">
            <Box className="flex-1 min-w-[100px]">
              <Text size="4" weight="bold" className="text-slate-700">
                Week {plan.weekNumber}
              </Text>
            </Box>
            <Box className="flex-1 text-center">
              <Heading size="6" className="text-slate-800">
                Weekly Work Plan <span className="font-normal text-slate-500">({dateRange})</span>
              </Heading>
            </Box>
            <Box className="flex-1 flex justify-end min-w-[140px]">
              <Badge variant="solid" color="green" size="2">
                ✅ Live Schedule
              </Badge>
            </Box>
          </Flex>

          <Flex gap="2" mt="1" align="center" wrap="wrap">
            <Badge variant="soft" color="blue">Version {plan.version}</Badge>
            <Badge variant="soft" color="gray">{plan.meetings.length} meetings</Badge>
            {plan.tasks && plan.tasks.length > 0 && (
              <Badge variant="soft" color="orange">{plan.tasks.length} tasks</Badge>
            )}
            <Text size="1" color="gray">Updated: {new Date(plan.updatedAt).toLocaleString()}</Text>
          </Flex>
        </div>

        {/* ========================================================= */}
        {/* MEETINGS GRID – with VERTICAL UPRIGHT LABELS on LEFT */}
        {/* ========================================================= */}
        <Card size="3" className="mx-2 sm:mx-4 md:mx-6 p-2 sm:p-4 mt-4">
          <Flex align="center" justify="between" mb="3" wrap="wrap">
            <Text size="3" weight="bold">📋 Meetings ({plan.meetings.length})</Text>
            <Flex align="center" gap="1" className="text-xs">
              <Badge variant="solid" color="green" size="1">Live Schedule</Badge>
              <Text size="1" color="gray">–</Text>
              <Text size="1" color="gray">updates appear automatically</Text>
            </Flex>
          </Flex>

          {/* MAIN GRID: Label Column + Day Columns */}
          <div className="flex gap-2">
            {/* ----- LEFT LABEL COLUMN ----- */}
            <div className="flex flex-col items-center justify-start gap-2 min-w-[24px] max-w-[24px] pt-1">
              {/* MORNING label – upright, stacked vertical */}
              <div className="flex flex-col items-center justify-start text-xs font-bold text-amber-600 tracking-tight leading-[1.1]">
                <span>M</span>
                <span>O</span>
                <span>R</span>
                <span>N</span>
                <span>I</span>
                <span>N</span>
                <span>G</span>
              </div>

              {/* Spacer between morning and afternoon labels */}
              <div className="flex-1 min-h-[20px]" />

              {/* AFTERNOON label – upright, stacked vertical */}
              <div className="flex flex-col items-center justify-start text-xs font-bold text-blue-600 tracking-tight leading-[1.1]">
                <span>A</span>
                <span>F</span>
                <span>T</span>
                <span>E</span>
                <span>R</span>
                <span>N</span>
                <span>O</span>
                <span>O</span>
                <span>N</span>
              </div>
            </div>

            {/* ----- DAY COLUMNS ----- */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {dayData.map(({ day, morning, afternoon }) => {
                const dateDisplay = plan?.startDate ? getDateForDay(plan.startDate, day) : '';
                const hasMorning = morning.length > 0;
                const hasAfternoon = afternoon.length > 0;

                return (
                  <div key={day} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    {/* Day Header */}
                    <div className="font-bold text-sm text-center bg-slate-100 p-2 border-b border-slate-200">
                      {day} <span className="text-xs font-normal text-slate-500">({dateDisplay})</span>
                    </div>

                    {/* Morning Block - fixed min-height to align afternoon */}
                    <div className="p-2 border-b border-slate-100 min-h-[300px]">
                      {hasMorning ? (
                        <div className="space-y-2">{renderMeetingGroup(morning)}</div>
                      ) : (
                        <div className="flex items-center justify-center h-12">
                          <Text size="1" color="gray">(empty)</Text>
                        </div>
                      )}
                    </div>

                    {/* Afternoon Block */}
                    <div className="p-2 min-h-[60px]">
                      {hasAfternoon ? (
                        <div className="space-y-2">{renderMeetingGroup(afternoon)}</div>
                      ) : (
                        <div className="flex items-center justify-center h-12">
                          <Text size="1" color="gray">(empty)</Text>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* TASKS */}
        {/* ========================================================= */}
        {plan.tasks && plan.tasks.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }} className="mx-2 sm:mx-4 md:mx-6">
            <Flex align="center" gap="2" mb="2">
              <Text size="3" weight="bold">📌 Week-long Tasks</Text>
              <Badge variant="solid" color="orange" size="1">{plan.tasks.length}</Badge>
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

        {/* ========================================================= */}
        {/* LEGEND */}
        {/* ========================================================= */}
        {plan.legend && plan.legend.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} className="mx-2 sm:mx-4 md:mx-6">
            <Flex align="center" gap="2" mb="2">
              <Text size="3" weight="bold">📖 Legend</Text>
              <Badge variant="solid" color="blue" size="1">{plan.legend.length}</Badge>
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

        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center px-4 md:px-6 pb-4">
          <Text size="1" color="gray">
            This is an automated schedule from the Planning Office.
            {plan.status === 'draft' && ' ⚠️ This schedule is still in draft.'}
          </Text>
        </div>
      </Card>
    </div>
  );
}