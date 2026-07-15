// app/api/weekly-plans/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getWeekPlanById,
  updateWeekPlan,
  deleteWeekPlan,
  addMeetingToPlan,
  updateMeetingInPlan,
  deleteMeetingFromPlan,
} from '@/lib/weekly-plan-service';

// ============================================
// GET - Get a specific plan
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const plan = await getWeekPlanById(id);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

// ============================================
// PUT - Update a plan or meeting
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if this is a meeting operation
    if (body.meetingId) {
      // Update a specific meeting
      const { meetingId, ...meetingUpdates } = body;
      const updated = await updateMeetingInPlan(id, meetingId, meetingUpdates);

      if (!updated) {
        return NextResponse.json({ error: 'Plan or meeting not found' }, { status: 404 });
      }

      return NextResponse.json({
        message: 'Meeting updated successfully',
        plan: updated,
      });
    }

    // Regular plan update
    const updated = await updateWeekPlan(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Plan updated successfully',
      plan: updated,
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// ============================================
// DELETE - Delete a plan or meeting
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    // If meetingId is provided, delete just that meeting
    if (meetingId) {
      const updated = await deleteMeetingFromPlan(id, meetingId);
      if (!updated) {
        return NextResponse.json({ error: 'Plan or meeting not found' }, { status: 404 });
      }
      return NextResponse.json({
        message: 'Meeting deleted successfully',
        plan: updated,
      });
    }

    // Otherwise delete the entire plan
    const deleted = await deleteWeekPlan(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

// ============================================
// POST - Add a meeting to a plan
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const { meeting } = body;

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting data is required' }, { status: 400 });
    }

    const updated = await addMeetingToPlan(id, meeting);
    if (!updated) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Meeting added successfully',
      plan: updated,
    });
  } catch (error) {
    console.error('Error adding meeting:', error);
    return NextResponse.json({ error: 'Failed to add meeting' }, { status: 500 });
  }
}