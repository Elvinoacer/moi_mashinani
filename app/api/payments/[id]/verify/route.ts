import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin } from '@/lib/api';
import { IntaSendError, publicPayment } from '@/lib/intasend';
import { reconcilePayment } from '@/lib/payment-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await props.params;
    const payment = await Store.getPaymentById(id);
    if (!payment) throw new ApiError(404, 'Payment not found');
    const business = await Store.getBusinessById(payment.businessId);
    if (!business) throw new ApiError(404, 'Business not found');
    await requireBusinessAccess(req, business);
    const verified = await reconcilePayment(payment, Store);
    return NextResponse.json(publicPayment(verified), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return error instanceof IntaSendError ? NextResponse.json({ error: error.message }, { status: error.status }) : apiError(error);
  }
}
