import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const body = await req.json();
    const { success = true, mpesaRef } = body;

    const settled = Store.settlePayment(id, success, mpesaRef);
    if (!settled) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(settled);
  } catch (err) {
    console.error('Error settling payment:', err);
    return NextResponse.json({ error: 'Failed to settle payment' }, { status: 500 });
  }
}
