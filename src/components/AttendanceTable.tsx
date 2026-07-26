import React from 'react';

// Type definition for a single attendance day
export interface AttendanceDay {
  date: string;              // formatted date, e.g. "01 Jan 2026"
  firstIn: string | null;    // "HH:mm" or null
  lastOut: string | null;    // "HH:mm" or null
  firstClass: string;        // Tailwind colour classes
  lastClass: string;         // Tailwind colour classes
  status: string;            // e.g. "Present", "Weekend", "Late arrival"
  isWeekend: boolean;        // true for Saturday/Sunday
}

interface AttendanceTableProps {
  attendance: AttendanceDay[];
  userName?: string;         // optional, if you want to show who it is
}

export default function AttendanceTable({ attendance, userName }: AttendanceTableProps) {
  return (
    <div className="overflow-x-auto">
      {userName && (
        <h2 className="text-lg font-semibold mb-2">Attendance for {userName}</h2>
      )}
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              First In
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Out
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {attendance.map((day) => (
            <tr
              key={day.date}
              className={
                day.isWeekend
                  ? 'bg-red-50 border-l-4 border-red-500' // ← your weekend styling
                  : ''
              }
            >
              <td className="px-4 py-2 whitespace-nowrap">{day.date}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={day.firstClass}>{day.firstIn || '-'}</span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={day.lastClass}>{day.lastOut || '-'}</span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={day.isWeekend ? 'font-medium text-red-700' : ''}>
                  {day.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}