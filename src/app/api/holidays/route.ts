import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    let filter = {};
    if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      filter = {
        $or: [
          { start_date: { $gte: start, $lte: end } },
          { end_date: { $gte: start, $lte: end } }
        ]
      };
    }
    
    const holidays = await db.collection('holidays')
      .find(filter)
      .sort({ start_date: 1 })
      .toArray();
    
    const formatted = holidays.map(h => ({
      id: h._id.toString(),
      start_date: h.start_date.toISOString().slice(0,10),
      end_date: h.end_date.toISOString().slice(0,10),
      type: h.type,
      description: h.description,
      createdAt: h.createdAt,
    }));
    
    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { start_date, end_date, type, description } = body;
    
    if (!start_date || !end_date || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newHoliday = {
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      type,
      description: description || '',
      createdAt: new Date(),
    };
    
    const result = await db.collection('holidays').insertOne(newHoliday);
    return NextResponse.json({
      id: result.insertedId.toString(),
      start_date: newHoliday.start_date.toISOString().slice(0,10),
      end_date: newHoliday.end_date.toISOString().slice(0,10),
      type: newHoliday.type,
      description: newHoliday.description,
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}