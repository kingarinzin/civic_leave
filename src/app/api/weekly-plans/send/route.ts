// app/api/weekly-plans/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendWeekPlanEmail, getWeekPlanById } from '@/lib/weekly-plan-service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Log the raw request first
    console.log('📨 Received request to /api/weekly-plans/send');
    
    // Try to parse the body
    let body;
    try {
      body = await request.json();
      console.log('📨 Parsed body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse JSON body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON body. Make sure you are sending valid JSON.' },
        { status: 400 }
      );
    }

    const { planId, testEmail } = body;

    // Log what we received
    console.log(`📨 planId: ${planId}, testEmail: ${testEmail}`);

    // Validate planId
    if (!planId) {
      console.error('❌ planId is missing or undefined');
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Validate testEmail
    if (!testEmail) {
      console.error('❌ testEmail is missing or undefined');
      return NextResponse.json(
        { error: 'Recipient email (testEmail) is required' },
        { status: 400 }
      );
    }

    // Look up the plan
    console.log(`🔍 Looking up plan: ${planId}`);
    const plan = await getWeekPlanById(planId);
    if (!plan) {
      console.error(`❌ Plan ${planId} not found`);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Send the email
    console.log(`📧 Sending email for "${plan.weekLabel}" to ${testEmail}`);
    await sendWeekPlanEmail(planId, testEmail);

    return NextResponse.json({
      message: `Email sent successfully to ${testEmail}`,
    });
  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}