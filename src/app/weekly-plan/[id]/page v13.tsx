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
  division: string;          // Meeting Type
  department: string;        // Department (multi‑select)
  divisionName: string;      // Division (multi‑select from API)
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
// Helper: Format a date range for display (e.g., "13 - 17 July, 2026")
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
  if (!meeting.timeStart) return true; // All‑day meetings considered morning
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

  // Format the date range for the header
  const dateRange = formatDateRange(plan.startDate, plan.endDate);

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full">
      <Card size="3" className="w-full max-w-full rounded-none shadow-none">
        {/* ========================================================= */}
        {/* HEADER – three columns, no horizontal line below */}
        {/* ========================================================= */}
        <div className="px-4 md:px-6 pt-4">
          {/* Top row: Week info | Weekly Work Plan | Live Schedule */}
          <Flex align="center" justify="between" mb="2" wrap="wrap">
            {/* Left: Week number + date range */}
            <Box className="flex-1 min-w-[180px]">
              <Text size="4" weight="bold" className="text-slate-700">
                Week {plan.weekNumber}: {dateRange}
              </Text>
            </Box>

            {/* Center: Weekly Work Plan */}
            <Box className="flex-1 text-center">
              <Heading size="6" className="text-slate-800">
                Weekly Work Plan
              </Heading>
            </Box>

            {/* Right: Live Schedule badge */}
            <Box className="flex-1 flex justify-end min-w-[140px]">
              <Badge variant="solid" color="green" size="2">
                ✅ Live Schedule
              </Badge>
            </Box>
          </Flex>

          {/* Second row: metadata badges – NO horizontal line */}
          <Flex gap="2" mt="1" align="center" wrap="wrap">
            <Badge variant="soft" color="blue">
              Version {plan.version}
            </Badge>
            <Badge variant="soft" color="gray">
              {plan.meetings.length} meetings
            </Badge>
            {plan.tasks && plan.tasks.length > 0 && (
              <Badge variant="soft" color="orange">
                {plan.tasks.length} tasks
              </Badge>
            )}
            <Text size="1" color="gray">
              Updated: {new Date(plan.updatedAt).toLocaleString()}
            </Text>
          </Flex>
        </div>

        {/* ========================================================= */}
        {/* Meetings Grid – with morning/afternoon separation */}
        {/* ========================================================= */}
        <Card size="3" className="mx-2 sm:mx-4 md:mx-6 p-2 sm:p-4 mt-4">
          <Flex align="center" justify="between" mb="3" wrap="wrap">
            <Text size="3" weight="bold">
              📋 Meetings ({plan.meetings.length})
            </Text>
            <Text size="2" color="gray" className="text-xs">
              Live schedule – updates appear automatically
            </Text>
          </Flex>

          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-${Math.min(daysToShow.length, 7)} gap-3 items-start`}>
            {daysToShow.map((day) => {
              const dayMeetings = plan.meetings
                .filter((m) => m.day === day)
                .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));

              // Split into morning and afternoon
              const morningMeetings = dayMeetings.filter(isMorningMeeting);
              const afternoonMeetings = dayMeetings.filter(m => !isMorningMeeting(m));

              // Group each session by exact timeStart
              const groupByTime = (meetings: Meeting[]): Record<string, Meeting[]> => {
                return meetings.reduce<Record<string, Meeting[]>>((acc, meeting) => {
                  const key = meeting.timeStart || 'All Day';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(meeting);
                  return acc;
                }, {});
              };

              const morningGroups = groupByTime(morningMeetings);
              const afternoonGroups = groupByTime(afternoonMeetings);

              const hasMeetings = dayMeetings.length > 0;
              const dateDisplay = plan?.startDate ? getDateForDay(plan.startDate, day) : '';

              // Helper to render a session (morning or afternoon)
              const renderSession = (groups: Record<string, Meeting[]>, sessionLabel: string) => {
                const timeKeys = Object.keys(groups);
                if (timeKeys.length === 0) return null;

                return (
                  <div className="mb-3 last:mb-0">
                    <Badge variant="solid" color={sessionLabel === 'Morning' ? 'amber' : 'blue'} size="1" className="mb-2">
                      {sessionLabel}
                    </Badge>
                    <div className="space-y-2">
                      {timeKeys.map((timeStart) => {
                        const meetingsInGroup = groups[timeStart];
                        const count = meetingsInGroup.length;
                        const flexBasis = count > 1 ? `calc(${100 / count}% - 4px)` : '100%';
                        const displayTime = formatTimeDisplay(timeStart);

                        return (
                          <div key={timeStart} className="border-b border-slate-100 pb-2 last:border-0">
                            {/* Time badge */}
                            <Badge variant="soft" color="blue" className="mb-1" size="1">
                              🕐 {displayTime}
                            </Badge>

                            {/* Parallel cards */}
                            <div className="flex flex-wrap gap-1">
                              {meetingsInGroup.map((meeting) => (
                                <div
                                  key={meeting._id}
                                  className="bg-slate-50 rounded p-2 border-l-4 flex-1"
                                  style={{
                                    flex: `0 0 ${flexBasis}`,
                                    borderLeftColor: DIVISION_COLORS[meeting.division] || '#888',
                                  }}
                                >
                                  {/* Title */}
                                  <Text weight="bold" size="2">
                                    {meeting.title}
                                  </Text>

                                  {/* Meeting Type */}
                                  <div className="text-xs text-slate-600">
                                    🏢 {meeting.division}
                                  </div>

                                  {/* Venue */}
                                  {meeting.location && (
                                    <div className="text-xs text-slate-500">
                                      📍 {meeting.location}
                                    </div>
                                  )}

                                  {/* Department (blue badges) */}
                                  {meeting.department && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {meeting.department.split(',').map((d) => (
                                        <Badge key={d.trim()} variant="soft" color="blue" size="1">
                                          {d.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Division (green badges) */}
                                  {meeting.divisionName && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {meeting.divisionName.split(',').map((d) => (
                                        <Badge key={d.trim()} variant="soft" color="green" size="1">
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
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  key={day}
                  className={`border border-slate-200 rounded-lg p-3 bg-white ${
                    hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                  }`}
                >
                  {/* Day Header */}
                  <div className="font-bold text-sm text-center bg-slate-100 -mx-3 -mt-3 p-2 rounded-t-lg mb-2">
                    {day} <span className="text-xs font-normal text-slate-500">({dateDisplay})</span>
                  </div>

                  {!hasMeetings ? (
                    <div className="flex items-center justify-center h-12">
                      <Text size="1" color="gray" align="center">
                        No meetings
                      </Text>
                    </div>
                  ) : (
                    <>
                      {renderSession(morningGroups, 'Morning')}
                      {renderSession(afternoonGroups, 'Afternoon')}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Week-long Tasks */}
        {plan.tasks && plan.tasks.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }} className="mx-2 sm:mx-4 md:mx-6">
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

        {/* Legend */}
        {plan.legend && plan.legend.length > 0 && (
          <Card size="3" mt="4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} className="mx-2 sm:mx-4 md:mx-6">
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

        {/* Footer */}
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