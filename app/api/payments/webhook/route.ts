import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { apiError } from '@/lib/api';
import { getIntaSendConfig, IntaSendError, verifyWebhookChallenge } from '@/lib/intasend';
import { reconcilePayment } from '@/lib/payment-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const config = getIntaSendConfig();
    const raw = await req.text();
    if (raw.length > 32_000) return NextResponse.json({ error: 'Webhook payload is too large' }, { status: 413 });
    let event: Record<string, unknown>;
    try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!event || typeof event !== 'object' || Array.isArray(event) || !verifyWebhookChallenge(event.challenge, config.challenge)) {
      return NextResponse.json({ error: 'Invalid webhook challenge' }, { status: 401 });
    }
    if (event.topic !== 'collection_event') return NextResponse.json({ received: true, ignored: true });
    if (typeof event.api_ref !== 'string' || typeof event.invoice_id !== 'string' || !event.invoice_id || event.invoice_id.length > 300) {
      return NextResponse.json({ error: 'Missing collection reference or invoice ID' }, { status: 400 });
    }
    const payment = await Store.getPaymentByApiRef(event.api_ref);
    // A shared IntaSend account may collect payments for other applications.
    if (!payment) return NextResponse.json({ received: true, ignored: true });
    // Older attempts may arrive after a different successful invoice. A
    // completed, verified purchase is already fulfilled and cannot regress.
    if (payment.state === 'COMPLETE' && payment.verifiedAt) return NextResponse.json({ received: true, duplicate: true });
    // Webhook fields never authorize fulfilment. Reconcile against the
    // authenticated IntaSend payment status before activating a promotion.
    await reconcilePayment(payment, Store, event.invoice_id, config);
    return NextResponse.json({ received: true });
  } catch (error) {
    return error instanceof IntaSendError ? NextResponse.json({ error: error.message }, { status: error.status }) : apiError(error);
  }
}
