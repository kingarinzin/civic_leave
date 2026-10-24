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
  const month = targetDate.toLocaleString('default', { month: 'short' });

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
// Helper: Format the "Updated" timestamp with date and time
// =========================================================
function formatUpdatedDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
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

  const daysToShow = DAYS.filter((day) => {
    if (day === 'Saturday' || day === 'Sunday') {
      const hasMeetings = plan.meetings.some((m) => m.day === day);
      return hasMeetings;
    }
    return true;
  });

  const dateRange = formatDateRange(plan.startDate, plan.endDate);

  // Positional matrix
  const morningPerDay: Record<string, Meeting[]> = {};
  const afternoonPerDay: Record<string, Meeting[]> = {};

  daysToShow.forEach((day) => {
    const dayMeetings = plan.meetings
      .filter((m) => m.day === day)
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

    morningPerDay[day] = dayMeetings.filter(isMorningMeeting);
    afternoonPerDay[day] = dayMeetings.filter((m) => !isMorningMeeting(m));
  });

  const maxMorningRows = Math.max(
    0,
    ...daysToShow.map((day) => morningPerDay[day]?.length || 0)
  );
  const maxAfternoonRows = Math.max(
    0,
    ...daysToShow.map((day) => afternoonPerDay[day]?.length || 0)
  );

  const gridTemplateColumns = `40px repeat(${daysToShow.length}, minmax(0, 1fr))`;

  const renderMeetingCell = (meeting: Meeting | undefined) => {
    if (!meeting) {
      return <div className="px-2 py-1.5 min-h-[60px]"></div>;
    }

    return (
      <div className="px-2 py-1.5">
        <div className="text-[13px] font-semibold text-slate-500 tracking-wide uppercase mb-0.5">
          {formatTimeDisplay(meeting.timeStart)}
        </div>

        <div
          className="pl-2 border-l-2"
          style={{
            borderLeftColor: DIVISION_COLORS[meeting.division] || '#94a3b8',
            wordBreak: 'break-word',
          }}
        >
          <Text weight="bold" className="block text-[14px] leading-snug text-slate-800">
            {meeting.title}
          </Text>
          {meeting.location && (
            <div className="text-[13px] text-slate-500 leading-snug mt-0.5">
              📍 {meeting.location}
            </div>
          )}

          {(meeting.department || meeting.divisionName) && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {meeting.department &&
                meeting.department.split(',').map((d) => {
                  const full = d.trim();
                  if (!full) return null;
                  const abbr = abbrDept(full);
                  if (abbr === 'Com') {
                    return (
                      <Badge
                        key={`dept-${full}`}
                        variant="solid"
                        size="1"
                        title={full}
                        style={{
                          background: '#c9a227',
                          color: 'white',
                          padding: '1px 7px',
                          borderRadius: '0',
                          fontSize: '11px',
                        }}
                      >
                        {abbr}
                      </Badge>
                    );
                  }
                  return (
                    <AbbrBadge
                      key={`dept-${full}`}
                      name={full}
                      abbr={abbr}
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
                    padding: '1px 7px',
                    borderRadius: '0',
                    fontSize: '11px',
                  }}
                >
                  👤 {s.trim()}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white w-full max-w-full">
      <div className="w-full max-w-full">
        {/* ========================================================= */}
        {/* MASTHEAD */}
        {/* ========================================================= */}
        <div className="border-b-2 border-slate-800 pb-3 mb-4 px-4 md:px-8 pt-6">
          <div className="text-center">
            <span className="text-base font-bold uppercase tracking-[0.2em] text-slate-800">
              Anti-Corruption Commission
            </span>
          </div>

          <div className="text-center">
            <span className="text-base font-bold uppercase tracking-[0.2em] text-slate-800">
              Weekly Work Plan ({dateRange})
            </span>
          </div>

          {/* Meta strip */}
          <div className="flex items-center justify-between mt-3 text-[14px] text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-800">
                Week {plan.weekNumber}
              </span>
              <span className="text-slate-400">|</span>
              <span>Version {plan.version}</span>
              <span className="text-slate-400">|</span>
              <span>{plan.meetings.length} meetings</span>
              {plan.tasks && plan.tasks.length > 0 && (
                <>
                  <span className="text-slate-400">|</span>
                  <span>{plan.tasks.length} tasks</span>
                </>
              )}
            </div>
            <div className="text-slate-500 hidden sm:block">
              Updated {formatUpdatedDateTime(plan.updatedAt)}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MEETINGS CALENDAR */}
        {/* ========================================================= */}
        <div className="px-4 md:px-8">
          <div className="overflow-x-auto">
            <div
              className="grid border border-slate-300"
              style={{ gridTemplateColumns }}
            >
              {/* Row 1 — Day Headers */}
              <div className="bg-slate-800 border-b border-r border-slate-300"></div>
              {daysToShow.map((day) => {
                const dateDisplay = plan?.startDate ? getDateForDay(plan.startDate, day) : '';
                return (
                  <div
                    key={`header-${day}`}
                    className="bg-slate-800 border-b border-r border-slate-300 px-2 py-1.5 text-center text-white last:border-r-0"
                  >
                    <div className="text-[13px] font-bold uppercase tracking-wide">
                      {day}
                    </div>
                    <div className="text-[12px] font-normal text-slate-300">
                      {dateDisplay}
                    </div>
                  </div>
                );
              })}

              {/* MORNING VERTICAL LABEL */}
              <div
                className="bg-amber-50 border-b border-r border-slate-300 flex items-center justify-center py-3"
                style={{ gridRow: `span ${maxMorningRows}` }}
              >
                <span
                  className="text-[12px] font-bold text-amber-700 tracking-[0.25em]"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  MORNING
                </span>
              </div>

              {/* MORNING meeting rows */}
              {Array.from({ length: maxMorningRows }).map((_, rowIndex) =>
                daysToShow.map((day) => {
                  const meeting = morningPerDay[day]?.[rowIndex];
                  return (
                    <div
                      key={`am-${rowIndex}-${day}`}
                      className="border-b border-r border-dashed border-slate-300 align-top last:border-r-0"
                    >
                      {renderMeetingCell(meeting)}
                    </div>
                  );
                })
              )}

              {/* AFTERNOON VERTICAL LABEL */}
              <div
                className="bg-blue-50 border-r border-slate-300 flex items-center justify-center py-3"
                style={{ gridRow: `span ${maxAfternoonRows}` }}
              >
                <span
                  className="text-[12px] font-bold text-blue-700 tracking-[0.25em]"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  AFTERNOON
                </span>
              </div>

              {/* AFTERNOON meeting rows */}
              {Array.from({ length: maxAfternoonRows }).map((_, rowIndex) =>
                daysToShow.map((day) => {
                  const meeting = afternoonPerDay[day]?.[rowIndex];
                  return (
                    <div
                      key={`pm-${rowIndex}-${day}`}
                      className="border-b border-r border-dashed border-slate-300 align-top last:border-r-0"
                    >
                      {renderMeetingCell(meeting)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* WEEK-LONG TASKS */}
        {/* ========================================================= */}
        {plan.tasks && plan.tasks.length > 0 && (
          <div className="px-4 md:px-8 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-700">
                Week-long Tasks
              </h2>
              <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold">
                {plan.tasks.length}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              {plan.tasks.map((task, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-amber-600 text-[13px] font-bold mt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Text size="2" className="text-slate-700 leading-relaxed text-[14px]">
                    {task}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LEGEND */}
        {/* ========================================================= */}
        {plan.legend && plan.legend.length > 0 && (
          <div className="px-4 md:px-8 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-700">
                Legend
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 font-semibold">
                {plan.legend.length}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
                {plan.legend.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-baseline gap-2 text-[14px] py-0.5"
                  >
                    <span className="font-semibold text-slate-800 min-w-[44px]">
                      {item.key}
                    </span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-600">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}
        <div className="px-4 md:px-8 mt-8 mb-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-slate-500">
            <div>
              This is an automated schedule from the Planning Office
              {plan.status === 'draft' && ' — draft version'}
            </div>
            <div className="uppercase tracking-widest">
              Anti-Corruption Commission
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}