// lib/weekly-plan-service.ts
import { connectToDatabase } from './mongodb';
import { COLLECTIONS } from './collections';
import { ObjectId } from 'mongodb';

// ============================================
// TYPES
// ============================================
export interface Meeting {
  _id?: string | ObjectId;
  day: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  location: string;
  division: string;
  department: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WeeklyPlan {
  _id?: string | ObjectId;
  weekNumber: number;
  year: number;
  startDate: Date | string;
  endDate: Date | string;
  weekLabel: string;
  meetings: Meeting[];
  status: 'draft' | 'sent' | 'updated';
  version: number;
  sentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// HELPERS
// ============================================
function toObjectId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Create a new week plan
 */
export async function createWeekPlan(
  planData: Omit<WeeklyPlan, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'version'>
): Promise<WeeklyPlan> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const now = new Date();
  const newPlan = {
    ...planData,
    meetings: planData.meetings.map((m) => ({
      ...m,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    })),
    status: 'draft' as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newPlan);
  return { ...newPlan, _id: result.insertedId } as WeeklyPlan;
}

/**
 * Get a week plan by ID
 */
export async function getWeekPlanById(id: string | ObjectId): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const plan = await collection.findOne({ _id: toObjectId(id) });
  return plan as WeeklyPlan | null;
}

/**
 * Get all week plans (sorted by newest first)
 */
export async function getAllWeekPlans(): Promise<WeeklyPlan[]> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const plans = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return plans as WeeklyPlan[];
}

/**
 * Update a week plan (increments version)
 */
export async function updateWeekPlan(
  id: string | ObjectId,
  updates: Partial<Omit<WeeklyPlan, '_id' | 'createdAt' | 'version'>>
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const result = await collection.findOneAndUpdate(
    { _id: toObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result as WeeklyPlan | null;
}

/**
 * Add a meeting to a week plan
 */
export async function addMeetingToPlan(
  planId: string | ObjectId,
  meeting: Omit<Meeting, '_id' | 'createdAt' | 'updatedAt'>
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const newMeeting: Meeting = {
    ...meeting,
    _id: new ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.findOneAndUpdate(
    { _id: toObjectId(planId) },
    {
      $push: { meetings: newMeeting } as any,
      $set: { updatedAt: new Date() },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result as WeeklyPlan | null;
}

/**
 * Update a specific meeting in a week plan
 */
export async function updateMeetingInPlan(
  planId: string | ObjectId,
  meetingId: string | ObjectId,
  updates: Partial<Omit<Meeting, '_id' | 'createdAt' | 'updatedAt'>>
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  // Build the update object for the meeting fields
  const updateFields: Record<string, any> = {
    'meetings.$.updatedAt': new Date(),
  };

  if (updates.day !== undefined) updateFields['meetings.$.day'] = updates.day;
  if (updates.timeStart !== undefined) updateFields['meetings.$.timeStart'] = updates.timeStart;
  if (updates.timeEnd !== undefined) updateFields['meetings.$.timeEnd'] = updates.timeEnd;
  if (updates.title !== undefined) updateFields['meetings.$.title'] = updates.title;
  if (updates.location !== undefined) updateFields['meetings.$.location'] = updates.location;
  if (updates.division !== undefined) updateFields['meetings.$.division'] = updates.division;
  if (updates.department !== undefined) updateFields['meetings.$.department'] = updates.department;
  if (updates.description !== undefined) updateFields['meetings.$.description'] = updates.description;

  // ✅ FIX: Single $set, no duplicate key
  const result = await collection.findOneAndUpdate(
    {
      _id: toObjectId(planId),
      'meetings._id': toObjectId(meetingId),
    },
    {
      $set: updateFields,
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result as WeeklyPlan | null;
}

/**
 * Delete a meeting from a week plan
 */
export async function deleteMeetingFromPlan(
  planId: string | ObjectId,
  meetingId: string | ObjectId
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const result = await collection.findOneAndUpdate(
    { _id: toObjectId(planId) },
    {
      $pull: { meetings: { _id: toObjectId(meetingId) } } as any,
      $set: { updatedAt: new Date() },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result as WeeklyPlan | null;
}

/**
 * Delete a week plan
 */
export async function deleteWeekPlan(id: string | ObjectId): Promise<boolean> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const result = await collection.deleteOne({ _id: toObjectId(id) });
  return result.deletedCount === 1;
}

/**
 * Send email notification (PLACEHOLDER - Implement later)
 */
export async function sendWeekPlanNotification(planId: string | ObjectId): Promise<void> {
  const plan = await getWeekPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  console.log(`📧 [PLACEHOLDER] Email would be sent for: ${plan.weekLabel}`);
  console.log(`🔗 Link: ${process.env.NEXT_PUBLIC_APP_URL}/weekly-plan/${planId}`);

  // Update status to 'sent'
  await updateWeekPlan(planId, { status: 'sent', sentAt: new Date() });
}