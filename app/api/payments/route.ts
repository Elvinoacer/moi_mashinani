import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Store } from '@/lib/store';
import { requireUser, requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { formatKenyanPhone, calculateUpgrade } from '@/lib/payments';
import { getIntaSendConfig, IntaSendError, publicPayment } from '@/lib/intasend';
import { initializeCheckout } from '@/lib/payment-service';
import { PRO_PRICE_KES } from '@/lib/catalog-plan';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const businessId = new URL(req.url).searchParams.get('businessId');
    if (!businessId && user.role !== 'ADMIN') throw new ApiError(403, 'Choose a business to view its payments');
    if (businessId) {
      const business = await Store.getBusinessById(businessId);
      if (!business) throw new ApiError(404, 'Business not found');
      await requireBusinessAccess(req, business);
    }
    const payments = (await Store.getPayments()).filter((p) => !businessId || p.businessId === businessId);
    return NextResponse.json(payments.map(publicPayment), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await jsonBody(req);
    const { businessId, planId, phone } = body;
    const weeks = planId === 'PRO' ? 1 : body.weeks;
    if (planId === 'PRO' && body.weeks !== undefined && body.weeks !== 1) throw new ApiError(400, 'Pro checkout purchases one calendar month at a time');
    if (typeof businessId !== 'string' || (planId !== 'RECOMMENDED' && planId !== 'FEATURED' && planId !== 'PRO') || typeof weeks !== 'number' || ![1, 2, 4].includes(weeks)) {
      throw new ApiError(400, 'Choose Pro for one month, or a valid promotion plan and 1, 2, or 4 weeks');
    }
    if (body.method && body.method !== 'INTASEND_CHECKOUT') throw new ApiError(400, 'Use IntaSend checkout to pay');
    const business = await Store.getBusinessById(businessId);
    if (!business) throw new ApiError(404, 'Business not found');
    const user = await requireBusinessAccess(req, business);
    if (business.status !== 'ACTIVE') throw new ApiError(409, 'The business must be approved before paid plans can be activated');
    if (business.activeTier === 'FEATURED' && business.tierEndsAt && Date.parse(business.tierEndsAt) > Date.now() && planId === 'RECOMMENDED') {
      throw new ApiError(409, 'Your Featured promotion is active. Renew Featured or wait until it expires.');
    }
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 30)) throw new ApiError(400, 'Enter a valid Kenyan phone number');
    const formattedPhone = formatKenyanPhone(phone || business.phone);
    if (!/^254[17]\d{8}$/.test(formattedPhone)) throw new ApiError(400, 'Enter a valid Kenyan mobile number');
    const config = getIntaSendConfig();
    const existing = (await Store.getPayments()).find((p) => p.businessId === business.id && p.method === 'INTASEND_CHECKOUT' && ['CREATED', 'PENDING', 'PROCESSING'].includes(p.state));
    if (existing && (existing.planId !== planId || existing.weeks !== weeks)) {
      return NextResponse.json({ error: 'A payment is already pending for this business. Complete or verify it first.', payment: publicPayment(existing) }, { status: 409 });
    }
    const chargeKes = planId === 'PRO' ? PRO_PRICE_KES : calculateUpgrade(business, planId, weeks).chargeKes;
    const payment = existing || await Store.createPayment({
      apiRef: `MOIM_${randomUUID()}`,
      businessId: business.id, businessName: business.name, planId, weeks,
      amountKes: chargeKes, phone: formattedPhone, method: 'INTASEND_CHECKOUT',
      provider: 'INTASEND', currency: 'KES', state: 'CREATED',
      quoteTier: business.activeTier, quoteTierEndsAt: business.tierEndsAt,
    });
    try {
      const initialized = await initializeCheckout(payment, user.email, business.slug, Store, config);
      return NextResponse.json({ payment: publicPayment(initialized), checkoutUrl: initialized.checkoutUrl });
    } catch (error) {
      if (error instanceof IntaSendError) return NextResponse.json({ error: error.message, payment: publicPayment(payment) }, { status: error.status });
      throw error;
    }
  } catch (error) {
    return error instanceof IntaSendError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : apiError(error);
  }
}
