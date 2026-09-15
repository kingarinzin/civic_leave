
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import DocumentType from '@/models/DocumentType';
import Commission from '@/models/Commission';

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all document types and commissions from the database
    const [documentTypes, commissions] = await Promise.all([
      DocumentType.find({}).select('documentType _id').lean(),
      Commission.find({}).select('commission _id').lean(),
    ]);

    // Normalize to consistent { id, name } format
    const types = documentTypes.map((doc) => ({
      id: doc._id,
      name: doc.documentType,
    }));

    const comms = commissions.map((comm) => ({
      id: comm._id,
      name: comm.commission,
    }));

    return NextResponse.json({
      documentTypes: types,
      commissions: comms,
    });
  } catch (error) {
    console.error('GET /api/meetings/documents_dropdowns error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal Server Error',
        documentTypes: [],
        commissions: [],
      },
      { status: 500 }
    );
  }
}