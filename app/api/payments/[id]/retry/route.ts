import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin } from '@/lib/api';
import { IntaSendError, getIntaSendConfig, publicPayment } from '@/lib/intasend';
import { initializeCheckout } from '@/lib/payment-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await props.params;
    const payment = await Store.getPaymentById(id);
    if (!payment) throw new ApiError(404, 'Payment not found');
    const business = await Store.getBusinessById(payment.businessId);
    if (!business) throw new ApiError(404, 'Business not found');
    const user = await requireBusinessAccess(req, business);
    if (payment.state === 'COMPLETE') throw new ApiError(409, 'This payment has already been completed');
    if (payment.method !== 'INTASEND_CHECKOUT') throw new ApiError(409, 'This payment is not an IntaSend checkout');
    const initialized = await initializeCheckout(payment, user.email, business.slug, Store, getIntaSendConfig());
    return NextResponse.json({ payment: publicPayment(initialized), checkoutUrl: initialized.checkoutUrl });
  } catch (error) {
    return error instanceof IntaSendError ? NextResponse.json({ error: error.message }, { status: error.status }) : apiError(error);
  }
}
