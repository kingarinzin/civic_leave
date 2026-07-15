// app/weekly-plan/[id]/page.tsx
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
  status: 'draft' | 'sent' | 'updated';
  version: number;
  updatedAt: string;
}

// ============================================
// CONSTANTS
// ============================================
const DAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Card size="3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header - same as admin view but without edit buttons */}
        <Flex align="center" justify="between" mb="5" wrap="wrap">
          <Box>
            <Heading size="6">{plan.weekLabel}</Heading>
            <Flex gap="2" mt="1" align="center" wrap="wrap">
              <Badge variant="soft" color="blue">
                Version {plan.version}
              </Badge>
              <Badge variant="soft" color="gray">
                {plan.meetings.length} meetings
              </Badge>
              <Text size="1" color="gray">
                Updated: {new Date(plan.updatedAt).toLocaleString()}
              </Text>
            </Flex>
          </Box>
          <Badge variant="solid" color="green">
            ✅ Live Schedule
          </Badge>
        </Flex>

        {/* Plan Details - consistent with admin view */}
        <Card size="3" mb="4" style={{ background: '#f8fafc' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Box>
              <Text size="2" weight="medium" color="gray">
                Week Number
              </Text>
              <Text size="2">{plan.weekNumber}</Text>
            </Box>
            <Box>
              <Text size="2" weight="medium" color="gray">
                Year
              </Text>
              <Text size="2">{plan.year}</Text>
            </Box>
            <Box>
              <Text size="2" weight="medium" color="gray">
                Start Date
              </Text>
              <Text size="2">{new Date(plan.startDate).toLocaleDateString()}</Text>
            </Box>
            <Box>
              <Text size="2" weight="medium" color="gray">
                End Date
              </Text>
              <Text size="2">{new Date(plan.endDate).toLocaleDateString()}</Text>
            </Box>
          </div>
        </Card>

        {/* Meetings Grid - same responsive grid as admin view */}
        <Card size="3">
          <Flex align="center" justify="between" mb="3" wrap="wrap">
            <Text size="3" weight="bold">
              📋 Meetings ({plan.meetings.length})
            </Text>
            <Text size="2" color="gray" className="text-xs">
              Live schedule – updates appear automatically
            </Text>
          </Flex>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start">
            {DAYS.map((day) => {
              const dayMeetings = plan.meetings
                .filter((m) => m.day === day)
                .sort((a, b) => a.timeStart.localeCompare(b.timeStart));

              // Group by time slot
              const grouped = dayMeetings.reduce<Record<string, Meeting[]>>((acc, meeting) => {
                const key = `${meeting.timeStart} - ${meeting.timeEnd}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(meeting);
                return acc;
              }, {});

              const hasMeetings = dayMeetings.length > 0;

              return (
                <div
                  key={day}
                  className={`border border-slate-200 rounded-lg p-3 bg-white ${
                    hasMeetings ? 'min-h-[100px]' : 'min-h-[80px]'
                  }`}
                >
                  {/* Day Header - like admin view */}
                  <div className="font-bold text-sm text-center bg-slate-100 -mx-3 -mt-3 p-2 rounded-t-lg mb-2">
                    {day}
                    <Badge variant="soft" color="gray" ml="2" size="1">
                      {dayMeetings.length}
                    </Badge>
                  </div>

                  {Object.keys(grouped).length === 0 ? (
                    <div className="flex items-center justify-center h-12">
                      <Text size="1" color="gray" align="center">
                        No meetings
                      </Text>
                    </div>
                  ) : (
                    Object.keys(grouped).map((timeSlot) => {
                      const meetingsInSlot = grouped[timeSlot];
                      return (
                        <div
                          key={timeSlot}
                          className="mb-3 border-b border-slate-100 pb-2 last:border-0"
                        >
                          <Badge variant="soft" color="blue" className="mb-1" size="1">
                            🕐 {timeSlot}
                          </Badge>
                          <div className="flex flex-wrap gap-2">
                            {meetingsInSlot.map((meeting) => (
                              <div
                                key={meeting._id}
                                className="flex-1 min-w-[100px] bg-slate-50 rounded p-2 border-l-4"
                                style={{
                                  borderLeftColor: DIVISION_COLORS[meeting.division] || '#888',
                                }}
                              >
                                <Text weight="bold" size="2">
                                  {meeting.title}
                                </Text>
                                <div className="text-xs text-slate-600">
                                  🏢 {meeting.division}{' '}
                                  {meeting.department ? `(${meeting.department})` : ''}
                                </div>
                                {meeting.location && (
                                  <div className="text-xs text-slate-500">
                                    📍 {meeting.location}
                                  </div>
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
                                          fontSize: '10px',
                                        }}
                                      >
                                        👤 {stakeholder.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <Text size="1" color="gray">
            This is an automated schedule from the Planning Office.
            {plan.status === 'draft' && ' ⚠️ This schedule is still in draft.'}
          </Text>
        </div>
      </Card>
    </div>
  );
}