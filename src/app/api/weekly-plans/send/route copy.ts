// app/api/weekly-plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWeekPlan, getAllWeekPlans, getWeekPlanById } from '@/lib/weekly-plan-service';

// ============================================
// POST - Create a new week plan
// ============================================
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      weekNumber,
      year,
      startDate,
      endDate,
      weekLabel,
      meetings,
      tasks = [],    // ✅ default empty array
      legend = [],   // ✅ default empty array
    } = body;

    // Validation
    if (!weekNumber || !year || !startDate || !endDate || !weekLabel) {
      return NextResponse.json(
        { error: 'All plan details are required' },
        { status: 400 }
      );
    }

    if (!meetings || meetings.length === 0) {
      return NextResponse.json(
        { error: 'At least one meeting is required' },
        { status: 400 }
      );
    }

    // Check for empty titles
    const emptyTitle = meetings.some((m: any) => !m.title?.trim());
    if (emptyTitle) {
      return NextResponse.json(
        { error: 'All meetings must have a title' },
        { status: 400 }
      );
    }

    const newPlan = await createWeekPlan({
      weekNumber,
      year,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      weekLabel,
      meetings,
      tasks,    // ✅ now included
      legend,   // ✅ now included
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${baseUrl}/weekly-plan/${newPlan._id}`;

    return NextResponse.json(
      {
        message: 'Week plan created successfully!',
        plan: newPlan,
        link,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating week plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create week plan';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ============================================
// GET - Fetch week plan(s)
// ============================================
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (planId) {
      const plan = await getWeekPlanById(planId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      return NextResponse.json(plan);
    }

    const plans = await getAllWeekPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}