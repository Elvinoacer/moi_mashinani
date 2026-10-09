import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError } from '@/lib/api';
import { publicPayment } from '@/lib/intasend';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const payment = await Store.getPaymentById(id);
    if (!payment) throw new ApiError(404, 'Payment not found');
    const business = await Store.getBusinessById(payment.businessId);
    if (!business) throw new ApiError(404, 'Business not found');
    await requireBusinessAccess(req, business);
    return NextResponse.json(publicPayment(payment), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
