// lib/abbreviations.ts

/**
 * Maps full Department names (as stored in DB) → short abbreviation.
 * Source of truth for DISPLAY ONLY.
 * The DB still stores full names; only the UI abbreviates.
 */
export const DEPARTMENT_ABBR: Record<string, string> = {
  'Department of Investigation': 'DoI',
  'Commission': 'Com',
  'Secretariat Services': 'SS',
  'Department of Professional Support': 'DoPS',
  'Trashigang Regional Office': 'TRO',
  'Policy and Planning Division': 'PPD',
  'Bumthang Regional Officer': 'BRO',
  'Division of Analysis & Research': 'DARe',
  'Department of Prevention & Education': 'DoPE',
  'Phuentsholing Regional Office': 'PRO',
  'Legal Division': 'LD',
};

/**
 * Maps full Division names (as stored in DB) → short abbreviation.
 * Some DB rows store the abbreviation AS the name (e.g. "AFS", "DoPS"),
 * so we map those to themselves for a stable lookup.
 */
export const DIVISION_ABBR: Record<string, string> = {
  // Full-name keys
  'Administrative Complaint Resolution Division': 'ACRD',
  'Legal Division': 'LD',
  'HR & Training Services': 'HRS',
  'ChairPerson': 'CHP',
  'Compliance and Follow-up Division': 'CFD',
  'Expert Services': 'ES',
  'Branch I': 'BI',
  'Branch II': 'BII',
  'Phuentsholing Regional Office': 'PRO',
  'Asset Declaration Management Division': 'ADMD',
  'Evaluation And Assessment Division': 'EAD',
  'Prevention Division': 'PD',
  'Education Division': 'ED',
  'Division of Analysis & Research': 'DARe',
  'Bumthang Regional Officer': 'BRO',
  'Policy and Planning Division': 'PPD',
  'Trashigang Regional Office': 'TRO',
  'Complaints Management Division': 'CMD',
  'Evidence Management Division': 'EMD',
  'ICT & Media Services': 'ICTs',
  'Commissioner': 'Com',
  'Administration and Finance Services': 'AFS',

  // Rows where the DB already stores the abbreviation as `name`
  'DoPS': 'DoPS',
  'AFS': 'AFS',
  'SS': 'SS',
  'Tro': 'TRO', // normalise lowercase variant to TRO
};

/**
 * Return the short display label for a Department name.
 * Falls back to the full name if unknown.
 */
export function abbrDept(name: string): string {
  if (!name) return '';
  return DEPARTMENT_ABBR[name.trim()] ?? name;
}

/**
 * Return the short display label for a Division name.
 * Falls back to the full name if unknown.
 */
export function abbrDiv(name: string): string {
  if (!name) return '';
  return DIVISION_ABBR[name.trim()] ?? name;
}

/**
 * Generic: given a comma-separated string of names, return
 * comma-separated abbreviations. Used for multi-value fields
 * like meeting.department and meeting.divisionName.
 */
export function abbrList(
  value: string,
  resolver: (n: string) => string
): string {
  if (!value) return '';
  return value
    .split(',')
    .map((s) => resolver(s.trim()))
    .filter(Boolean)
    .join(', ');
}