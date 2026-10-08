"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import AbbrBadge from '@/components/AbbrBadge';
import { abbrDept, abbrDiv } from '@/lib/abbreviations';
import { DAYS, DIVISION_COLORS } from '@/lib/weekly-plan-constants';

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
// ⚠️ Constants imported from `lib/weekly-plan-constants.ts`
// =========================================================

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
// Helper: Format a date range for display
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
  const daysToShow = DAYS.filter((day) => {
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

  // Render meeting cards for a group – stacked vertically, sequential times.
  // Department + Division badges flow on ONE line and only wrap if there is no room.
  const renderMeetingGroup = (meetings: Meeting[]) => {
    const grouped = groupByTime(meetings);
    return Object.entries(grouped).map(([timeStart, meetingsInGroup]) => {
      const displayTime = formatTimeDisplay(timeStart);

      return (
        <div key={timeStart} className="border-b border-dashed border-slate-200 pb-1.5 last:border-0 last:pb-0">
          <Badge variant="soft" color="blue" className="mb-0.5" size="1" style={{ fontSize: '10px' }}>
            🕐 {displayTime}
          </Badge>
          <div className="space-y-1">
            {meetingsInGroup.map((meeting) => (
              <div
                key={meeting._id}
                className="bg-slate-50 rounded-none p-1.5 border-l-4"
                style={{
                  borderLeftColor: DIVISION_COLORS[meeting.division] || '#888',
                  wordBreak: 'break-word',
                }}
              >
                <Text weight="bold" className="block text-[11px] leading-tight">
                  {meeting.title}
                </Text>
                {meeting.location && (
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    📍 {meeting.location}
                  </div>
                )}

                {/* Department + Division combined — flow inline, wrap only if no room */}
                {(meeting.department || meeting.divisionName) && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {meeting.department &&
                      meeting.department.split(',').map((d) => {
                        const full = d.trim();
                        if (!full) return null;
                        return (
                          <AbbrBadge
                            key={`dept-${full}`}
                            name={full}
                            abbr={abbrDept(full)}
                            color="blue"
                          />
                        );
                      })}
                    {meeting.divisionName &&
                      meeting.divisionName.split(',').map((d) => {
                        const full = d.trim();
                        if (!full) return null;
                        return (
                          <AbbrBadge
                            key={`div-${full}`}
                            name={full}
                            abbr={abbrDiv(full)}
                            color="green"
                          />
                        );
                      })}
                  </div>
                )}

                {/* Stakeholders (purple chips) */}
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
                          padding: '1px 6px',
                          borderRadius: '0',
                          fontSize: '9px',
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

  // Build the grid template columns dynamically
  const gridTemplateColumns = `60px repeat(${dayData.length}, minmax(0, 1fr))`;

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full">
      <Card
        size="3"
        className="w-full max-w-full rounded-none shadow-none"
        style={{ border: 'none' }}
      >
        {/* ========================================================= */}
        {/* HEADER — meta line left-aligned */}
        {/* ========================================================= */}
        <div className="px-4 md:px-6 pt-4">
          {/* "ANTI-CORRUPTION COMMISSION" line above the title */}
          <div className="text-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Anti-Corruption Commission
            </span>
          </div>

          {/* Main title — Weekly Work Plan + date range, centered */}
          <div className="text-center mb-2">
            <Heading size="4" className="text-slate-800">
              Weekly Work Plan <span className="font-normal text-slate-500">({dateRange})</span>
            </Heading>
          </div>

          {/* Meta line — Week N · Version · meetings · tasks · Updated — LEFT ALIGNED */}
          <Flex
            align="center"
            justify="start"
            gap="2"
            mb="2"
            wrap="wrap"
            className="text-sm text-slate-600"
          >
            <Text size="4" weight="bold" className="text-slate-700">
              Week {plan.weekNumber}
            </Text>
            <span className="text-slate-300">·</span>
            <Badge variant="soft" color="blue">Version {plan.version}</Badge>
            <span className="text-slate-300">·</span>
            <Badge variant="soft" color="gray">{plan.meetings.length} meetings</Badge>
            {plan.tasks && plan.tasks.length > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <Badge variant="soft" color="orange">{plan.tasks.length} tasks</Badge>
              </>
            )}
            <span className="text-slate-300">·</span>
            <Text size="1" color="gray">
              Updated: {new Date(plan.updatedAt).toLocaleString()}
            </Text>
          </Flex>
        </div>

        {/* ========================================================= */}
        {/* MEETINGS GRID — CSS Grid with header row + morning row + afternoon row.
            Wrapper card has NO visible border. */}
        {/* ========================================================= */}
        <div className="mx-2 sm:mx-4 md:mx-6 mt-4">
          <Flex align="center" justify="between" mb="3" wrap="wrap">
            <Text size="3" weight="bold">📋 Meetings ({plan.meetings.length})</Text>
            <Flex align="center" gap="1" className="text-xs">
              <Badge variant="solid" color="green" size="1">Live Schedule</Badge>
              <Text size="1" color="gray">–</Text>
              <Text size="1" color="gray">updates appear automatically</Text>
            </Flex>
          </Flex>

          <div className="overflow-x-auto">
            <div
              className="grid border border-slate-300"
              style={{
                gridTemplateColumns,
                gridTemplateRows: 'auto auto auto',
              }}
            >
              {/* ROW 1 — Day Headers */}
              <div className="border-b border-r border-slate-300 bg-slate-100 min-h-[32px]"></div>
              {dayData.map(({ day }) => {
                const dateDisplay = plan?.startDate ? getDateForDay(plan.startDate, day) : '';
                return (
                  <div
                    key={`header-${day}`}
                    className="border-b border-r border-slate-300 bg-slate-100 px-2 py-1 text-center font-bold text-[11px] last:border-r-0"
                  >
                    {day.toUpperCase()}
                    <div className="text-[10px] font-normal text-slate-500">({dateDisplay})</div>
                  </div>
                );
              })}

              {/* ROW 2 — MORNING label + morning content */}
              <div className="border-b border-r border-slate-300 bg-amber-50 flex items-center justify-center py-2">
                <span
                  className="text-[10px] font-bold text-amber-700 tracking-widest"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  MORNING
                </span>
              </div>

              {dayData.map(({ day, morning }) => {
                const hasMorning = morning.length > 0;
                return (
                  <div
                    key={`am-${day}`}
                    className="border-b border-r border-slate-300 p-1.5 last:border-r-0 align-top"
                  >
                    {hasMorning ? (
                      <div className="space-y-1.5">{renderMeetingGroup(morning)}</div>
                    ) : (
                      <div className="flex items-center justify-center h-10 text-[10px] text-slate-400">
                        (empty)
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ROW 3 — AFTERNOON label + afternoon content */}
              <div className="border-r border-slate-300 bg-blue-50 flex items-center justify-center py-2">
                <span
                  className="text-[10px] font-bold text-blue-700 tracking-widest"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  AFTERNOON
                </span>
              </div>

              {dayData.map(({ day, afternoon }) => {
                const hasAfternoon = afternoon.length > 0;
                return (
                  <div
                    key={`pm-${day}`}
                    className="border-r border-slate-300 p-1.5 last:border-r-0 align-top min-h-[60px]"
                  >
                    {hasAfternoon ? (
                      <div className="space-y-1.5">{renderMeetingGroup(afternoon)}</div>
                    ) : (
                      <div className="flex items-center justify-center h-10 text-[10px] text-slate-400">
                        (empty)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Week-long Tasks — NO outer border on the wrapper. */}
        {/* ========================================================= */}
        {plan.tasks && plan.tasks.length > 0 && (
          <div className="mx-2 sm:mx-4 md:mx-6 mt-4 rounded-none p-3 bg-amber-50">
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
          </div>
        )}

        {/* ========================================================= */}
        {/* Legend — NO outer border on the wrapper. Legend rows keep their inner borders. */}
        {/* ========================================================= */}
        {plan.legend && plan.legend.length > 0 && (
          <div className="mx-2 sm:mx-4 md:mx-6 mt-4 rounded-none p-3 bg-sky-50">
            <Flex align="center" gap="2" mb="2">
              <Text size="3" weight="bold">📖 Legend</Text>
              <Badge variant="solid" color="blue" size="1">{plan.legend.length}</Badge>
            </Flex>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {plan.legend.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm bg-white rounded-none px-3 py-1.5 border border-slate-100"
                >
                  <span className="font-medium text-slate-700">{item.key}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-slate-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Footer */}
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