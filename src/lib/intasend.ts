import { timingSafeEqual } from 'node:crypto';
import type { PaymentRecord } from './types';

/** IntaSend contracts: developers.intasend.com/guides/collections/checkout/
 * and developers.intasend.com/guides/webhooks/. Secrets stay on the server. */
export class IntaSendError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'IntaSendError';
  }
}

export interface IntaSendConfig {
  mode: 'sandbox' | 'live';
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  challenge: string;
  appOrigin: string;
}

export function getIntaSendConfig(env: Record<string, string | undefined> = process.env): IntaSendConfig {
  const mode = env.INTASEND_MODE || 'sandbox';
  const publicKey = env.INTASEND_PUBLIC_KEY?.trim();
  const secretKey = env.INTASEND_SECRET_KEY?.trim();
  const challenge = env.INTASEND_WEBHOOK_CHALLENGE?.trim();
  if (!['sandbox', 'live'].includes(mode) || !publicKey || !secretKey || !challenge || !env.APP_URL) {
    throw new IntaSendError('Payments are not configured. Please contact the administrator.', 503);
  }
  const keyMode = mode === 'sandbox' ? '_test_' : '_live_';
  if (!publicKey.startsWith(`ISPubKey${keyMode}`) || !secretKey.startsWith(`ISSecretKey${keyMode}`)) {
    throw new IntaSendError('Payment keys do not match the configured environment.', 503);
  }
  let appUrl: URL;
  try { appUrl = new URL(env.APP_URL); } catch {
    throw new IntaSendError('The payment return URL is not configured correctly.', 503);
  }
  if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password || appUrl.pathname !== '/' || appUrl.search || appUrl.hash) {
    throw new IntaSendError('Payments require APP_URL to be an HTTPS origin.', 503);
  }
  return {
    mode: mode as IntaSendConfig['mode'],
    baseUrl: mode === 'sandbox' ? 'https://sandbox.intasend.com/api/v1' : 'https://api.intasend.com/api/v1',
    publicKey, secretKey, challenge, appOrigin: appUrl.origin,
  };
}

type Fetcher = typeof fetch;
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IntaSendError('IntaSend returned an invalid response. Please retry verification.');
  }
  return value as JsonObject;
}

function requiredString(value: unknown, maxLength = 300): string {
  if (typeof value !== 'string' || !value || value.length > maxLength) {
    throw new IntaSendError('IntaSend returned incomplete payment details.');
  }
  return value;
}

/** Parse monetary values as minor units, without floating-point rounding. */
export function amountInCents(value: unknown): number | undefined {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) return undefined;
  const [whole, fraction = ''] = String(value).split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : undefined;
}

async function request(config: IntaSendConfig, path: string, body: JsonObject, authentication: 'public' | 'secret', fetcher: Fetcher): Promise<JsonObject> {
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        ...(authentication === 'public'
          ? { 'X-IntaSend-Public-API-Key': config.publicKey }
          : { Authorization: `Bearer ${config.secretKey}` }),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new IntaSendError('IntaSend could not be reached. Retry using the same payment.');
  }
  if (!response.ok) {
    // Never return provider error bodies: they may contain credentials or PII.
    throw new IntaSendError('IntaSend could not process this request. Please retry or contact the administrator.');
  }
  try { return object(await response.json()); } catch (error) {
    if (error instanceof IntaSendError) throw error;
    throw new IntaSendError('IntaSend returned an invalid response.');
  }
}

export interface IntaSendCheckout { id: string; url: string; signature: string }

export async function createIntaSendCheckout(payment: PaymentRecord, email: string, slug: string, config = getIntaSendConfig(), fetcher: Fetcher = fetch): Promise<IntaSendCheckout> {
  const data = await request(config, '/checkout/', {
    amount: payment.amountKes,
    currency: 'KES',
    email,
    phone_number: payment.phone,
    api_ref: payment.apiRef,
    unique_api_ref: true,
    redirect_url: `${config.appOrigin}/promote/${encodeURIComponent(slug)}?payment=${encodeURIComponent(payment.id)}`,
    host: config.appOrigin,
    country: 'KE',
    mobile_tarrif: 'BUSINESS-PAYS',
    card_tarrif: 'BUSINESS-PAYS',
    bank_tarrif: 'BUSINESS-PAYS',
    bitcoin_tarrif: 'BUSINESS-PAYS',
    ach_tarrif: 'BUSINESS-PAYS',
  }, 'public', fetcher);
  const id = requiredString(data.id);
  const url = requiredString(data.url, 2048);
  const signature = requiredString(data.signature, 4096);
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new IntaSendError('IntaSend returned an invalid checkout URL.'); }
  const expectedHost = config.mode === 'sandbox' ? 'sandbox.intasend.com' : 'payment.intasend.com';
  const allowedHosts = config.mode === 'sandbox' ? [expectedHost] : [expectedHost, 'api.intasend.com'];
  if (parsed.protocol !== 'https:' || !allowedHosts.includes(parsed.hostname) || parsed.username || parsed.password || parsed.port || !parsed.pathname.startsWith('/checkout/')) {
    throw new IntaSendError('IntaSend returned an untrusted checkout URL.');
  }
  if (amountInCents(data.amount) !== payment.amountKes * 100 || data.currency !== 'KES') {
    throw new IntaSendError('IntaSend checkout amount or currency does not match this payment.');
  }
  return { id, url, signature };
}

export interface VerifiedInvoice {
  invoiceId: string;
  apiRef: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  providerRef?: string;
  failedReason?: string;
}

export async function verifyIntaSendPayment(payment: PaymentRecord, invoiceId?: string, config = getIntaSendConfig(), fetcher: Fetcher = fetch): Promise<VerifiedInvoice | undefined> {
  if (payment.provider !== 'INTASEND' || payment.method !== 'INTASEND_CHECKOUT' || payment.currency !== 'KES') {
    throw new IntaSendError('This payment cannot be verified through IntaSend.', 409);
  }
  if (payment.providerInvoiceId && invoiceId && payment.providerInvoiceId !== invoiceId) {
    throw new IntaSendError('Invoice does not match the stored payment.', 409);
  }
  const requestedInvoice = invoiceId || payment.providerInvoiceId;
  if (!requestedInvoice && !payment.checkoutId) return undefined;
  const data = await request(config, '/payment/status/', requestedInvoice
    ? { invoice_id: requestedInvoice }
    : { checkout_id: payment.checkoutId, signature: payment.checkoutSignature }, 'secret', fetcher);
  // Checkout can exist before the customer has made a payment attempt.
  if (data.invoice === null) return undefined;
  const invoice = object(data.invoice);
  const actualInvoiceId = requiredString(invoice.invoice_id);
  if ((requestedInvoice && requestedInvoice !== actualInvoiceId) ||
      (payment.providerInvoiceId && payment.providerInvoiceId !== actualInvoiceId) ||
      invoice.api_ref !== payment.apiRef || invoice.currency !== payment.currency ||
      amountInCents(invoice.value) !== payment.amountKes * 100) {
    throw new IntaSendError('IntaSend payment details do not match the expected invoice, reference, amount and currency.', 409);
  }
  const state = requiredString(invoice.state);
  const states: Record<string, VerifiedInvoice['state']> = {
    PENDING: 'PENDING', PROCESSING: 'PROCESSING', RETRY: 'PROCESSING', PARTIAL: 'PROCESSING',
    COMPLETE: 'COMPLETE', FAILED: 'FAILED', CANCELED: 'FAILED', CANCELLED: 'FAILED',
  };
  if (!Object.hasOwn(states, state)) throw new IntaSendError('IntaSend returned an unknown payment state.');
  return {
    invoiceId: actualInvoiceId,
    apiRef: payment.apiRef,
    state: states[state],
    providerRef: typeof invoice.provider_ref === 'string' ? invoice.provider_ref : undefined,
    failedReason: typeof invoice.failed_reason === 'string' ? invoice.failed_reason.slice(0, 500) : undefined,
  };
}

export function verifyWebhookChallenge(value: unknown, expected: string): boolean {
  if (typeof value !== 'string' || !expected || value.length > 1000) return false;
  const actual = Buffer.from(value);
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}

export function publicPayment(payment: PaymentRecord): Omit<PaymentRecord, 'checkoutSignature'> {
  const { checkoutSignature, ...result } = payment;
  void checkoutSignature;
  return result;
}
