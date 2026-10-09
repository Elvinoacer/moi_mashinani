import { NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET() {
  try {
    const zones = await Store.getZones();
    return NextResponse.json(zones);
  } catch (err) {
    console.error('Error fetching zones:', err);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
