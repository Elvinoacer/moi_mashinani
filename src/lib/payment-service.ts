import type { PaymentRecord } from './types';
import {
  createIntaSendCheckout, getIntaSendConfig, verifyIntaSendPayment,
  type IntaSendConfig, type VerifiedInvoice,
} from './intasend';

export interface PaymentStore {
  updatePayment(id: string, changes: Partial<PaymentRecord>): Promise<PaymentRecord | undefined>;
  confirmVerifiedPayment(id: string, verification: Omit<VerifiedInvoice, 'apiRef'>): Promise<PaymentRecord | undefined>;
}

export async function initializeCheckout(payment: PaymentRecord, email: string, slug: string, store: PaymentStore, config: IntaSendConfig = getIntaSendConfig(), fetcher: typeof fetch = fetch): Promise<PaymentRecord> {
  if (payment.checkoutUrl && payment.checkoutId && payment.checkoutSignature) return payment;
  const checkout = await createIntaSendCheckout(payment, email, slug, config, fetcher);
  const updated = await store.updatePayment(payment.id, {
    checkoutId: checkout.id, checkoutUrl: checkout.url, checkoutSignature: checkout.signature,
    state: 'PENDING', failedReason: '',
  });
  if (!updated) throw new Error('Payment disappeared during checkout initialization');
  return updated;
}

export async function reconcilePayment(payment: PaymentRecord, store: PaymentStore, invoiceId?: string, config: IntaSendConfig = getIntaSendConfig(), fetcher: typeof fetch = fetch): Promise<PaymentRecord> {
  const verified = await verifyIntaSendPayment(payment, invoiceId, config, fetcher);
  if (!verified || payment.state === 'COMPLETE') return payment;
  if (verified.state === 'COMPLETE') {
    const confirmed = await store.confirmVerifiedPayment(payment.id, verified);
    if (!confirmed) throw new Error('Payment disappeared during confirmation');
    return confirmed;
  }
  // Checkout can have several failed attempts before a successful attempt.
  // Bind the unique invoice only when success has been verified.
  const updated = await store.updatePayment(payment.id, {
    state: verified.state, failedReason: verified.failedReason || '',
  });
  if (!updated) throw new Error('Payment disappeared during reconciliation');
  return updated;
}
