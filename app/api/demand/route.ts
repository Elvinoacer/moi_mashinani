import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET() {
  const requests = Store.getServiceRequests();
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = Store.createServiceRequest(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error logging demand:', err);
    return NextResponse.json({ error: 'Failed to record request' }, { status: 400 });
  }
}
