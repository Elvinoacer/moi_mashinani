import { NextResponse } from 'next/server';

// A browser must never be able to mark its own payment successful.
export async function POST() {
  return NextResponse.json({ error: 'Client settlement is disabled. Verify your payment through IntaSend.' }, { status: 410 });
}
