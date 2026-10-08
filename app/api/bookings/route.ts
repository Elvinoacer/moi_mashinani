import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = Store.createBookingIntent(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error recording booking intent:', err);
    return NextResponse.json({ error: 'Failed to record booking' }, { status: 400 });
  }
}
