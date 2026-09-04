import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee } from '@/models/Employee';

export async function POST(request, { params }) {
  try {
    const { cid } = await params;
    if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 });

    await connectToDatabase();
    const employee = await Employee.findOne({ cidNumber: cid });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('photo');
    if (!file) return NextResponse.json({ error: 'No photo uploaded' }, { status: 400 });

    // Convert to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const updated = await Employee.findOneAndUpdate(
      { cidNumber: cid },
      { $set: { passportPhoto: base64, lastUpdated: new Date() } },
      { new: true }
    );

    return NextResponse.json({ success: true, photoUrl: base64, employee: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}