import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  amountInCents, createIntaSendCheckout, getIntaSendConfig, IntaSendError,
  publicPayment, verifyIntaSendPayment, verifyWebhookChallenge,
} from '../src/lib/intasend';
import { initializeCheckout, reconcilePayment, type PaymentStore } from '../src/lib/payment-service';
import { calculateUpgrade, formatKenyanPhone } from '../src/lib/payments';
import type { Business, PaymentRecord } from '../src/lib/types';

const env = {
  INTASEND_MODE: 'sandbox', INTASEND_PUBLIC_KEY: 'ISPubKey_test_mock',
  INTASEND_SECRET_KEY: 'ISSecretKey_test_mock', INTASEND_WEBHOOK_CHALLENGE: 'mock-private-challenge',
  APP_URL: 'https://business.example',
};
const config = getIntaSendConfig(env);
const base: PaymentRecord = {
  id: 'pay_mock', apiRef: 'MOIM_mock', businessId: 'biz_mock', businessName: 'Mock business',
  planId: 'FEATURED', weeks: 2, amountKes: 400, phone: '254712345678', state: 'PENDING',
  method: 'INTASEND_CHECKOUT', provider: 'INTASEND', currency: 'KES',
  createdAt: '2026-10-09T00:00:00.000Z', checkoutId: 'checkout_mock',
  checkoutUrl: 'https://sandbox.intasend.com/checkout/checkout_mock/express/',
  checkoutSignature: 'provider-signature-mock',
};
const completeInvoice = {
  invoice_id: 'invoice_mock', state: 'COMPLETE', api_ref: base.apiRef, currency: 'KES',
  value: '400.00', charges: '12.00', net_amount: '388.00', provider_ref: 'MPESA_MOCK',
};
function fetchResponse(value: unknown, verify?: (url: string, init: RequestInit) => void, status = 200): typeof fetch {
  return (async (url: URL | RequestInfo, init?: RequestInit) => {
    verify?.(String(url), init || {});
    return Response.json(value, { status });
  }) as typeof fetch;
}
function memoryStore() {
  let record = { ...base };
  let activations = 0;
  const store: PaymentStore = {
    async updatePayment(id, changes) {
      assert.equal(id, record.id);
      if (record.state !== 'COMPLETE') record = { ...record, ...changes };
      return { ...record };
    },
    async confirmVerifiedPayment(id, verified) {
      assert.equal(id, record.id);
      if (record.state !== 'COMPLETE') {
        activations++;
        record = { ...record, state: 'COMPLETE', providerInvoiceId: verified.invoiceId, providerRef: verified.providerRef };
      }
      return { ...record };
    },
  };
  return { store, record: () => record, activations: () => activations };
}

test('configuration fails closed without credentials, HTTPS origin, or matching key environments', () => {
  assert.throws(() => getIntaSendConfig({}), (error) => error instanceof IntaSendError && error.status === 503);
  for (const invalid of [
    { INTASEND_WEBHOOK_CHALLENGE: '' }, { INTASEND_SECRET_KEY: '' }, { APP_URL: 'http://localhost:3000' },
    { APP_URL: 'https://business.example/nested' }, { APP_URL: 'https://user:password@business.example' },
    { INTASEND_MODE: 'live' }, { INTASEND_MODE: 'unexpected' },
  ]) assert.throws(() => getIntaSendConfig({ ...env, ...invalid }), IntaSendError);
  const live = getIntaSendConfig({ ...env, INTASEND_MODE: 'live', INTASEND_PUBLIC_KEY: 'ISPubKey_live_mock', INTASEND_SECRET_KEY: 'ISSecretKey_live_mock' });
  assert.equal(live.baseUrl, 'https://api.intasend.com/api/v1');
});

test('server prices enforce allowed durations and full-price upgrades', () => {
  const business = { activeTier: 'RECOMMENDED', tierEndsAt: '2099-01-01T00:00:00.000Z' } as Business;
  assert.equal(calculateUpgrade(business, 'FEATURED', 1).chargeKes, 200);
  assert.equal(calculateUpgrade(business, 'FEATURED', 4).chargeKes, 800);
  for (const duration of [0, -1, 0.5, 52, NaN]) assert.throws(() => calculateUpgrade(business, 'FEATURED', duration));
  assert.equal(formatKenyanPhone('+254 712 345 678'), '254712345678');
  assert.equal(formatKenyanPhone('0712345678'), '254712345678');
});

test('monetary values parse exactly and reject malformed, rounded or unsafe amounts', () => {
  assert.equal(amountInCents('400.00'), 40000);
  assert.equal(amountInCents(400), 40000);
  assert.equal(amountInCents('0.01'), 1);
  for (const value of ['400.001', '4e2', '-400', Infinity, null, {}, '900719925474099100.01', '']) assert.equal(amountInCents(value), undefined);
});

test('checkout uses server quote, public key, fee settings, safe return URL and unique retry reference', async () => {
  let requests = 0;
  const checkout = await createIntaSendCheckout(base, 'owner@example.com', 'mock business', config, fetchResponse({
    id: 'checkout_mock', url: base.checkoutUrl, signature: 'mock-signature', amount: '400.00', currency: 'KES', paid: true,
  }, (url, init) => {
    requests++;
    assert.equal(url, 'https://sandbox.intasend.com/api/v1/checkout/');
    const headers = init.headers as Record<string, string>;
    assert.equal(headers['X-IntaSend-Public-API-Key'], env.INTASEND_PUBLIC_KEY);
    assert.equal(headers.Authorization, undefined);
    const body = JSON.parse(init.body as string);
    assert.equal(body.amount, 400); assert.equal(body.currency, 'KES');
    assert.equal(body.api_ref, base.apiRef); assert.equal(body.unique_api_ref, true);
    assert.equal(body.mobile_tarrif, 'BUSINESS-PAYS'); assert.equal(body.card_tarrif, 'BUSINESS-PAYS');
    assert.equal(body.redirect_url, 'https://business.example/promote/mock%20business?payment=pay_mock');
    assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
  }));
  assert.equal(requests, 1); assert.equal(checkout.id, base.checkoutId);
  // Even an IntaSend checkout `paid` field is not an activation signal.
  assert.equal(base.state, 'PENDING');
});

test('checkout rejects changed amounts/currency and untrusted URLs', async () => {
  const response = { id: 'checkout_mock', url: base.checkoutUrl, signature: 'signature', amount: 400, currency: 'KES' };
  for (const changed of [
    { amount: 399 }, { currency: 'USD' }, { url: 'https://sandbox.intasend.com.evil.example/checkout/x' },
    { url: 'http://sandbox.intasend.com/checkout/x' }, { url: 'https://sandbox.intasend.com:9443/checkout/x' },
    { url: 'https://sandbox.intasend.com/settings' }, { signature: '' },
  ]) await assert.rejects(createIntaSendCheckout(base, 'owner@example.com', 'business', config, fetchResponse({ ...response, ...changed })), IntaSendError);
});

test('checkout initialization reuses persisted provider checkout without another request', async () => {
  const memory = memoryStore();
  const unexpected = (async () => { throw new Error('Unexpected provider call'); }) as typeof fetch;
  const payment = await initializeCheckout(base, 'owner@example.com', 'business', memory.store, config, unexpected);
  assert.equal(payment.checkoutId, base.checkoutId);
  assert.equal(memory.activations(), 0);
});

test('ambiguous creation retry reuses api_ref and never grants a tier', async () => {
  const memory = memoryStore();
  const payment = { ...base, checkoutId: undefined, checkoutUrl: undefined, checkoutSignature: undefined };
  const initialized = await initializeCheckout(payment, 'owner@example.com', 'business', memory.store, config, fetchResponse({
    id: 'checkout_mock', url: base.checkoutUrl, signature: 'mock-signature', amount: 400, currency: 'KES',
  }, (_url, init) => {
    const body = JSON.parse(init.body as string);
    assert.equal(body.unique_api_ref, true); assert.equal(body.api_ref, payment.apiRef);
  }));
  assert.equal(initialized.state, 'PENDING'); assert.equal(memory.activations(), 0);
});

test('status verification uses secret key and stored checkout credentials, gross amount rather than net settlement', async () => {
  const verified = await verifyIntaSendPayment(base, undefined, config, fetchResponse({ invoice: completeInvoice }, (url, init) => {
    assert.equal(url, 'https://sandbox.intasend.com/api/v1/payment/status/');
    assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${env.INTASEND_SECRET_KEY}`);
    assert.deepEqual(JSON.parse(init.body as string), { checkout_id: base.checkoutId, signature: base.checkoutSignature });
  }));
  assert.equal(verified?.state, 'COMPLETE'); assert.equal(verified?.providerRef, 'MPESA_MOCK');
});

test('payment amount, currency, reference and invoice binding mismatches never activate', async () => {
  for (const changed of [
    { value: '399.00' }, { value: '400.001' }, { value: -400 }, { currency: 'USD' }, { api_ref: 'another-order' },
    { invoice_id: 'different-invoice' }, { state: 'UNKNOWN' },
  ]) {
    const memory = memoryStore();
    await assert.rejects(reconcilePayment(base, memory.store, 'invoice_mock', config, fetchResponse({ invoice: { ...completeInvoice, ...changed } })), IntaSendError);
    assert.equal(memory.activations(), 0); assert.equal(memory.record().state, 'PENDING');
  }
  await assert.rejects(verifyIntaSendPayment({ ...base, providerInvoiceId: 'bound-invoice' }, 'different-invoice', config), IntaSendError);
});

test('partial, processing, cancelled and failed attempts do not activate or bind an invoice', async () => {
  for (const state of ['PENDING', 'PROCESSING', 'RETRY', 'PARTIAL', 'FAILED', 'CANCELED']) {
    const memory = memoryStore();
    await reconcilePayment(base, memory.store, 'invoice_mock', config, fetchResponse({ invoice: { ...completeInvoice, state } }));
    assert.equal(memory.activations(), 0); assert.equal(memory.record().providerInvoiceId, undefined);
  }
});

test('verified success activates once across concurrent callback/reconciliation and does not regress', async () => {
  const memory = memoryStore();
  await Promise.all([
    reconcilePayment(base, memory.store, 'invoice_mock', config, fetchResponse({ invoice: completeInvoice })),
    reconcilePayment(base, memory.store, 'invoice_mock', config, fetchResponse({ invoice: completeInvoice })),
  ]);
  assert.equal(memory.activations(), 1); assert.equal(memory.record().state, 'COMPLETE');
  const lateFailure = await reconcilePayment(memory.record(), memory.store, 'invoice_mock', config, fetchResponse({ invoice: { ...completeInvoice, state: 'FAILED' } }));
  assert.equal(lateFailure.state, 'COMPLETE'); assert.equal(memory.activations(), 1);
});

test('failed invoice followed by successful new invoice can complete the same checkout', async () => {
  const memory = memoryStore();
  const failed = await reconcilePayment(base, memory.store, 'invoice_failed', config, fetchResponse({ invoice: { ...completeInvoice, invoice_id: 'invoice_failed', state: 'FAILED' } }));
  assert.equal(failed.state, 'FAILED'); assert.equal(failed.providerInvoiceId, undefined);
  await reconcilePayment(failed, memory.store, 'invoice_success', config, fetchResponse({ invoice: { ...completeInvoice, invoice_id: 'invoice_success' } }));
  assert.equal(memory.record().providerInvoiceId, 'invoice_success'); assert.equal(memory.activations(), 1);
});

test('provider failures and absent invoice never grant a promotion', async () => {
  const memory = memoryStore();
  const pending = await reconcilePayment(base, memory.store, undefined, config, fetchResponse({ invoice: null }));
  assert.equal(pending.state, 'PENDING');
  for (const value of [null, {}, { invoice: [] }, { invoice: {} }]) {
    await assert.rejects(reconcilePayment(base, memory.store, undefined, config, fetchResponse(value)), IntaSendError);
  }
  await assert.rejects(reconcilePayment(base, memory.store, undefined, config, fetchResponse({ detail: 'secret mock' }, undefined, 503)), (error) => error instanceof IntaSendError && !error.message.includes('secret mock'));
  const networkFailure = (async () => { throw new Error('network'); }) as typeof fetch;
  await assert.rejects(reconcilePayment(base, memory.store, undefined, config, networkFailure), IntaSendError);
  assert.equal(memory.activations(), 0);
});

test('legacy mock/manual payment cannot be confirmed through the new integration', async () => {
  await assert.rejects(verifyIntaSendPayment({ ...base, method: 'MANUAL_MPESA' }, undefined, config), IntaSendError);
  await assert.rejects(verifyIntaSendPayment({ ...base, provider: undefined }, undefined, config), IntaSendError);
});

test('webhook challenge rejects missing/incorrect values and public payment strips signature', () => {
  assert.equal(verifyWebhookChallenge(env.INTASEND_WEBHOOK_CHALLENGE, config.challenge), true);
  for (const value of [undefined, '', {}, 1, 'mock-private-challengf', 'a'.repeat(1001)]) assert.equal(verifyWebhookChallenge(value, config.challenge), false);
  assert.equal('checkoutSignature' in publicPayment(base), false);
  assert.equal(publicPayment(base).checkoutId, base.checkoutId);
});
