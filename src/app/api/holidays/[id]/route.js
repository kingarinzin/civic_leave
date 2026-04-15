import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;   // ✅ await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const holiday = await db.collection('holidays').findOne({ _id: new ObjectId(id) });
    if (!holiday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: holiday._id.toString(),
      start_date: holiday.start_date.toISOString().slice(0, 10),
      end_date: holiday.end_date.toISOString().slice(0, 10),
      type: holiday.type,
      description: holiday.description,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch holiday' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;   // ✅ await params
    console.log("PUT received id:", id);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const body = await request.json();
    console.log("PUT body:", body);
    const { start_date, end_date, type, description } = body;

    const updateData = {};
    if (start_date) updateData.start_date = new Date(start_date);
    if (end_date) updateData.end_date = new Date(end_date);
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description;

    const result = await db.collection('holidays').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Holiday updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;   // ✅ await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const result = await db.collection('holidays').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}