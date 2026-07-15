// lib/collections.ts
export const COLLECTIONS = {
  WEEKLY_PLANS: 'weekly_plans',
  USERS: 'users',
  DEPARTMENTS: 'departments',
  LEAVE_REQUESTS: 'leave_requests',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];