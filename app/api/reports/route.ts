import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET() {
  const reports = Store.getReports();
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = Store.createReport(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error filing report:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 400 });
  }
}
