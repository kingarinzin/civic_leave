import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee } from '@/models/Employee';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Connect and ensure the connection is ready
    await connectToDatabase();
    
    // Wait for the connection to be fully open
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection not ready, state:', mongoose.connection.readyState);
      return NextResponse.json(
        { error: 'Database connection not ready' },
        { status: 503 }
      );
    }

    const employees = await Employee.find().sort({ fullName: 1 });
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}