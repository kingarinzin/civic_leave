// lib/weekly-plan-constants.ts

// =========================================================
// Shared constants for the Weekly Plan feature.
// Import from here instead of redefining locally in each page.
// =========================================================

export const DAYS: string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Same as DAYS — but under a distinct name used by the public view
// (kept for clarity in that file's code; both reference the same list)
export const ALL_DAYS: string[] = DAYS;

// =========================================================
// MEETING TYPES
// ---------------------------------------------------------
// The add page allows the user to pick "Others" and type a custom
// meeting type. The edit page does not have that flow, so it uses
// the base list without "Others".
// =========================================================
export const DIVISIONS_WITH_OTHERS: string[] = [
  'Commission meeting',
  'Commisison meeting on case',
  'Regular Commission Meeting',
  'CEC',
  'HRC',
  'Finance Committe meeting',
  'Endowment Committee meeting',
  'CM on ATR apprisal',
  'CM on complaints, IE, & ATR',
  'CM on Judgment Appraisal',
  'Committee',
];

export const DIVISIONS_BASE: string[] = [
  'Commission meeting',
  'Commisison meeting on case',
  'Regular Commission Meeting',
  'CEC',
  'HRC',
  'Finance Committe meeting',
  'Endowment Committee meeting',
  'CM on ATR apprisal',
  'CM on complaints, IE, & ATR',
  'Committee',
  'CM on Judgment Appraisal',
];

// =========================================================
// MEETING VENUES
// =========================================================
export const LOCATION_OPTIONS: string[] = [
  'Druk Dradhir Khang',
  'Chungchen Phurkhang',
  'Taagtshang Sherab Jorden Khang',
  'Meeting Room adjacent to PPD',
  'Chhoesham',
  'Director incharge Chamber',
  'Commisssioner incharge Chamber',
  'Others',
];

// =========================================================
// DIVISION COLORS (used for the left border of meeting cards)
// =========================================================
export const DIVISION_COLORS: Record<string, string> = {
  IT: '#4caf50',
  Finance: '#ff9800',
  HR: '#f44336',
  Administration: '#2196f3',
  Operations: '#9c27b0',
  Legal: '#607d8b',
  Communications: '#00bcd4',
};