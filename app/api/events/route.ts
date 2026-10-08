import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, type } = body;

    if (businessId && type) {
      Store.recordEvent(businessId, type);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Always return success for telemetry beacon
  }
}
