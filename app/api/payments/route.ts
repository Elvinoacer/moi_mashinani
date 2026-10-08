import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { formatKenyanPhone, calculateUpgrade } from '@/lib/payments';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  let payments = Store.getPayments();
  if (businessId) {
    payments = payments.filter((p) => p.businessId === businessId);
  }
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, planId, weeks, phone, method, mpesaRef } = body;

    const business = Store.getBusinessById(businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (!['RECOMMENDED', 'FEATURED'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid promotion plan' }, { status: 400 });
    }

    const { chargeKes } = calculateUpgrade(business, planId, weeks || 1);
    const formattedPhone = formatKenyanPhone(phone || business.phone);

    const payment = Store.createPayment({
      businessId: business.id,
      businessName: business.name,
      planId,
      weeks: weeks || 1,
      amountKes: chargeKes,
      phone: formattedPhone,
      method: method || 'STK_PUSH',
      mpesaRef,
      state: method === 'MANUAL_MPESA' ? 'PROCESSING' : 'PENDING',
    });

    return NextResponse.json({
      payment,
      message:
        method === 'MANUAL_MPESA'
          ? 'Manual M-Pesa submitted for review'
          : `STK push initiated to ${formattedPhone} for KES ${chargeKes}`,
    });
  } catch (err) {
    console.error('Error starting payment:', err);
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}
