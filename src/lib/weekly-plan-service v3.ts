// lib/weekly-plan-service.ts
import { connectToDatabase } from './mongodb';
import { COLLECTIONS } from './collections';
import { ObjectId } from 'mongodb';
import { createTransporter } from './mailer';

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
  stakeholders?: string;
  description: string;
  googleEventId?: string;
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
  tasks: string[];
  legend: { key: string; value: string }[];
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
    tasks: planData.tasks || [],
    legend: planData.legend || [],
    status: 'draft' as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newPlan);
  return { ...newPlan, _id: result.insertedId } as WeeklyPlan;
}

export async function getWeekPlanById(id: string | ObjectId): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const plan = await collection.findOne({ _id: toObjectId(id) });
  return plan as WeeklyPlan | null;
}

export async function getAllWeekPlans(): Promise<WeeklyPlan[]> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const plans = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return plans as WeeklyPlan[];
}

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

export async function addMeetingToPlan(
  planId: string | ObjectId,
  meeting: Omit<Meeting, '_id' | 'createdAt' | 'updatedAt' | 'googleEventId'>
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const newMeeting: Meeting = {
    ...meeting,
    _id: new ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ✅ FIX: Cast $push to any to bypass strict type checking
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

export async function updateMeetingInPlan(
  planId: string | ObjectId,
  meetingId: string | ObjectId,
  updates: Partial<Omit<Meeting, '_id' | 'createdAt' | 'updatedAt'>>
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

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
  if (updates.stakeholders !== undefined) updateFields['meetings.$.stakeholders'] = updates.stakeholders;
  if (updates.description !== undefined) updateFields['meetings.$.description'] = updates.description;
  if (updates.googleEventId !== undefined) updateFields['meetings.$.googleEventId'] = updates.googleEventId;

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

export async function deleteMeetingFromPlan(
  planId: string | ObjectId,
  meetingId: string | ObjectId
): Promise<WeeklyPlan | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const meetingIdStr = meetingId.toString();
  const planIdObj = toObjectId(planId);

  // ✅ FIX: Cast $pull to any to bypass strict type checking
  const result = await collection.findOneAndUpdate(
    { _id: planIdObj },
    {
      $pull: { meetings: { _id: meetingIdStr } } as any,
      $set: { updatedAt: new Date() },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result as WeeklyPlan | null;
}

export async function deleteWeekPlan(id: string | ObjectId): Promise<boolean> {
  const { db } = await connectToDatabase();
  const collection = db.collection(COLLECTIONS.WEEKLY_PLANS);

  const result = await collection.deleteOne({ _id: toObjectId(id) });
  return result.deletedCount === 1;
}

// ============================================
// EMAIL FUNCTIONS
// ============================================
export async function sendWeekPlanEmail(
  planId: string | ObjectId,
  recipientEmail: string
): Promise<void> {
  const plan = await getWeekPlanById(planId);
  if (!plan) throw new Error('Plan not found');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const planLink = `${baseUrl}/weekly-plan/${planId}`;

  // Build meetings summary
  let meetingsHtml = '';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meetingsByDay = plan.meetings.reduce((acc, m) => {
    if (!acc[m.day]) acc[m.day] = [];
    acc[m.day].push(m);
    return acc;
  }, {} as Record<string, typeof plan.meetings>);

  for (const day of days) {
    const dayMeetings = meetingsByDay[day] || [];
    if (dayMeetings.length === 0) continue;
    meetingsHtml += `<h4 style="margin:8px 0 4px 0; color:#1976d2;">${day}</h4>`;
    for (const meeting of dayMeetings) {
      meetingsHtml += `
        <div style="background:#f5f5f5; padding:8px; border-radius:4px; margin-bottom:6px; border-left:4px solid #1976d2;">
          <strong>${meeting.timeStart} - ${meeting.timeEnd}</strong> &nbsp;|&nbsp; ${meeting.title}<br/>
          <span style="font-size:0.9em; color:#555;">🏢 ${meeting.division} ${meeting.department ? `(${meeting.department})` : ''}</span>
          ${meeting.location ? `<br/><span style="font-size:0.9em; color:#555;">📍 ${meeting.location}</span>` : ''}
          ${meeting.stakeholders ? `<br/><span style="font-size:0.9em; color:#555;">👤 ${meeting.stakeholders}</span>` : ''}
        </div>
      `;
    }
  }

  // Tasks and legend
  let tasksHtml = '';
  if (plan.tasks && plan.tasks.length > 0) {
    tasksHtml = `<h4 style="margin:8px 0 4px 0; color:#1976d2;">📌 Week-long Tasks</h4><ul>`;
    for (const task of plan.tasks) {
      tasksHtml += `<li>${task}</li>`;
    }
    tasksHtml += `</ul>`;
  }

  let legendHtml = '';
  if (plan.legend && plan.legend.length > 0) {
    legendHtml = `<h4 style="margin:8px 0 4px 0; color:#1976d2;">📖 Legend</h4><dl style="display:grid; grid-template-columns:auto 1fr; gap:4px 12px;">`;
    for (const item of plan.legend) {
      legendHtml += `<dt style="font-weight:bold;">${item.key}</dt><dd>${item.value}</dd>`;
    }
    legendHtml += `</dl>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Weekly Plan</title>
    </head>
    <body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; background:#f9f9f9;">
      <div style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color:#1976d2; margin-bottom:4px;">📅 ${plan.weekLabel}</h1>
        <p style="color:#666; margin-top:0;">Version ${plan.version} &bull; ${plan.meetings.length} meetings</p>
        <hr style="border:none; border-top:2px solid #e0e0e0; margin:16px 0;" />

        ${meetingsHtml}
        ${tasksHtml}
        ${legendHtml}

        <div style="text-align:center; margin:24px 0;">
          <a href="${planLink}" style="display:inline-block; padding:12px 24px; background:#1976d2; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">
            View Full Schedule
          </a>
          <p style="font-size:0.85em; color:#999; margin-top:8px;">
            💡 This link always shows the latest version – no need to refresh.
          </p>
        </div>

        <hr style="border:none; border-top:1px solid #e0e0e0; margin:16px 0;" />
        <p style="font-size:0.8em; color:#999; text-align:center;">
          This is an automated email from the Planning Office.
        </p>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Planning Office" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `📅 Weekly Plan: ${plan.weekLabel}`,
    html,
  });

  // Update status to 'sent'
  await updateWeekPlan(planId, { status: 'sent', sentAt: new Date() });
}

export async function sendWeekPlanNotification(
  planId: string | ObjectId,
  recipientEmail?: string
): Promise<void> {
  if (!recipientEmail) throw new Error('Recipient email required');
  await sendWeekPlanEmail(planId, recipientEmail);
}