import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Employee } from '@/models/Employee';

// ------------------------------------------------------------------
// GET – Return ONLY the passportPhoto (lightweight, for lazy loading)
// ------------------------------------------------------------------
export async function GET(request, { params }) {
  try {
    const { cid } = await params;
    if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 });

    await connectToDatabase();
    const employee = await Employee.findOne({ cidNumber: cid })
      .select('passportPhoto')
      .lean();

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({
      cidNumber: cid,
      passportPhoto: employee.passportPhoto || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch photo', details: error.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------
// POST – Upload or replace photo
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// DELETE – Remove employee photo
// ------------------------------------------------------------------
export async function DELETE(request, { params }) {
  try {
    const { cid } = await params;
    if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 });

    await connectToDatabase();
    const employee = await Employee.findOne({ cidNumber: cid });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Remove the photo field
    const updated = await Employee.findOneAndUpdate(
      { cidNumber: cid },
      { $set: { passportPhoto: null, lastUpdated: new Date() } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
      employee: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed', details: error.message }, { status: 500 });
  }
}