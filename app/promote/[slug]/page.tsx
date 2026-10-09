'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { AccountGate } from '@/components/AccountGate';
import { calculateUpgrade, PROMOTION_PLANS } from '@/lib/payments';
import { useNow } from '@/lib/useNow';
import type { Business, PaymentRecord } from '@/lib/types';
import { Tag, RefreshCw, CheckCircle2, AlertCircle } from '@/components/icons';

const panel = 'bg-white signboard-border rounded-2xl p-6 space-y-5';
const button = 'rounded-full bg-[#243b32] px-6 py-3 text-sm font-bold text-white disabled:opacity-50';

function Checkout({ slug }: { slug: string }) {
  const now = useNow();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'RECOMMENDED' | 'FEATURED'>('FEATURED');
  const [weeks, setWeeks] = useState(1);
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/businesses/${encodeURIComponent(slug)}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Business not found');
        const business: Business = data;
        setBusiness(business); setPhone(business.phone);
        const paymentsResponse = await fetch(`/api/payments?businessId=${encodeURIComponent(business.id)}`, { cache: 'no-store', signal: controller.signal });
        const records = await paymentsResponse.json();
        if (!paymentsResponse.ok) throw new Error(records.error || 'Could not load your payments');
        const returnedId = new URLSearchParams(window.location.search).get('payment');
        const existing: PaymentRecord | undefined = returnedId
          ? records.find((item: PaymentRecord) => item.id === returnedId && item.method === 'INTASEND_CHECKOUT')
          : records.find((item: PaymentRecord) => item.method === 'INTASEND_CHECKOUT' && ['CREATED', 'PENDING', 'PROCESSING'].includes(item.state));
        if (returnedId && !existing) throw new Error('This payment does not belong to this business');
        if (existing) {
          setPayment(existing);
          if (returnedId && existing.state !== 'COMPLETE') {
            const verifiedResponse = await fetch(`/api/payments/${encodeURIComponent(existing.id)}/verify`, { method: 'POST', signal: controller.signal });
            const verified = await verifiedResponse.json();
            if (verifiedResponse.ok) setPayment(verified);
            else setError(verified.error || 'Payment verification is temporarily unavailable. You can check again below.');
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load checkout');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [slug]);

  const pendingId = payment && !['COMPLETE', 'FAILED', 'EXPIRED'].includes(payment.state) ? payment.id : null;
  useEffect(() => {
    if (!pendingId) return;
    const controller = new AbortController();
    let polling = false;
    const timer = setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(pendingId)}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted && response.ok) setPayment(data);
      } catch { /* The explicit verification button remains available. */ }
      finally { polling = false; }
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [pendingId]);

  async function verify() {
    if (!payment) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(payment.id)}/verify`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not verify payment');
      setPayment(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify payment'); }
    finally { setBusy(false); }
  }

  async function resume() {
    if (!payment) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(payment.id)}/retry`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || 'Could not open checkout');
      setPayment(data.payment);
      window.location.assign(data.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open checkout'); setBusy(false); }
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!business) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, planId: selectedPlan, weeks, phone, method: 'INTASEND_CHECKOUT' }),
      });
      const data = await response.json();
      if (data.payment) setPayment(data.payment);
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || 'Could not start checkout');
      window.location.assign(data.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start checkout'); setBusy(false); }
  }

  if (loading) return <div className={panel} role="status">Loading checkout…</div>;
  if (!business) return <div className={panel}><p role="alert">{error || 'Business not found'}</p><Link href="/dashboard" className={button}>Return to dashboard</Link></div>;
  const { chargeKes } = calculateUpgrade(business, selectedPlan, weeks);
  const featuredActive = business.activeTier === 'FEATURED' && Boolean(business.tierEndsAt && Date.parse(business.tierEndsAt) > now);
  const currentEnd = business.tierEndsAt ? Date.parse(business.tierEndsAt) : 0;
  const startTime = business.activeTier === selectedPlan && currentEnd > now ? currentEnd : now;
  const estimatedEnd = new Date(startTime + weeks * 7 * 864e5).toLocaleDateString('en-KE', { dateStyle: 'medium' });

  return <>
    <div className={panel}>
      <div className="text-xs font-bold uppercase text-[#667064]">Promote your business</div>
      <h1 className="font-display text-2xl font-bold text-[#243b32]">{business.name}</h1>
      <Link href={`/dashboard/${business.slug}`} className="text-sm font-semibold underline">← Back to dashboard</Link>
    </div>
    {error && <div className="rounded-xl border border-[#a7302d] bg-white p-4 text-sm text-[#a7302d]" role="alert">{error}</div>}
    {payment ? <div className={`${panel} text-center`} aria-live="polite">
      {payment.state === 'COMPLETE' ? <>
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#335e41]" />
        <h2 className="font-display text-2xl font-bold">Payment verified</h2>
        <p className="text-sm text-[#667064]">IntaSend has confirmed KSh {payment.amountKes} for {payment.weeks} {payment.weeks === 1 ? 'week' : 'weeks'} of {PROMOTION_PLANS[payment.planId].name} promotion. Your dashboard shows the current promotion dates.</p>
        <p className="break-all text-xs">Receipt: {payment.receiptNumber || payment.id}<br />Reference: {payment.providerRef || payment.apiRef}</p>
        <Link href={`/dashboard/${business.slug}`} className={`${button} inline-block`}>View your dashboard</Link>
      </> : <>
        {['FAILED', 'EXPIRED'].includes(payment.state) ? <AlertCircle className="mx-auto h-12 w-12 text-[#a7302d]" /> : <RefreshCw className="mx-auto h-12 w-12 text-[#335e41]" />}
        <h2 className="font-display text-2xl font-bold">{payment.state === 'FAILED' ? 'Payment incomplete' : 'Waiting for payment confirmation'}</h2>
        <p className="text-sm text-[#667064]">KSh {payment.amountKes} · {PROMOTION_PLANS[payment.planId].name} · {payment.weeks} {payment.weeks === 1 ? 'week' : 'weeks'}</p>
        <p className="text-sm text-[#667064]">{payment.failedReason || 'Complete the payment on IntaSend. Your promotion activates after payment is confirmed.'}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={resume} disabled={busy} className={button}>{busy ? 'Please wait…' : 'Open IntaSend checkout'}</button>
          <button type="button" onClick={verify} disabled={busy} className="rounded-full border border-[#dfe5d8] px-5 py-3 text-sm font-bold disabled:opacity-50">Check payment status</button>
        </div>
        <p className="text-xs text-[#667064]">You can close this page and return to check your payment later.</p>
      </>}
    </div> : <form onSubmit={start} className={panel}>
      <fieldset>
        <legend className="mb-3 font-display text-lg font-bold">1. Choose your promotion</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['RECOMMENDED', 'FEATURED'] as const).map((plan) => <label key={plan} className={`cursor-pointer rounded-xl border p-4 ${selectedPlan === plan ? 'border-[#335e41] bg-[#edf2e5]' : 'border-[#dfe5d8]'} ${plan === 'RECOMMENDED' && featuredActive ? 'opacity-50' : ''}`}>
            <input type="radio" name="plan" value={plan} checked={selectedPlan === plan} disabled={plan === 'RECOMMENDED' && featuredActive} onChange={() => setSelectedPlan(plan)} className="mr-2" />
            <span className="font-bold">{PROMOTION_PLANS[plan].name}</span>
            <p className="mt-2 font-bold">KSh {PROMOTION_PLANS[plan].priceKesWeek}/week</p>
            <p className="mt-2 text-xs text-[#667064]">{plan === 'FEATURED' ? 'Priority placement in search and homepage Featured sections.' : 'Placement above free listings and a Recommended badge.'}</p>
          </label>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-display text-lg font-bold">2. Choose duration</legend>
        <div className="flex gap-3">{[1, 2, 4].map((duration) => <button key={duration} type="button" aria-pressed={duration === weeks} onClick={() => setWeeks(duration)} className={`flex-1 rounded-lg border py-3 text-sm font-bold ${weeks === duration ? 'bg-[#243b32] text-white' : 'border-[#dfe5d8]'}`}>{duration} {duration === 1 ? 'week' : 'weeks'}</button>)}</div>
        <p className="mt-2 text-xs text-[#667064]">Estimated end: {estimatedEnd}. The promotion begins when payment is verified. Renewals extend your current promotion.</p>
      </fieldset>
      <div>
        <label htmlFor="payment-phone" className="mb-2 block font-display text-lg font-bold">3. Payment phone number</label>
        <input id="payment-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0712345678" className="w-full rounded-lg border border-[#dfe5d8] p-3" />
        <p className="mt-2 text-xs text-[#667064]">Choose M-Pesa or another available payment method on IntaSend&apos;s secure checkout.</p>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-[#edf2e5] p-4"><span>Total</span><strong className="font-display text-2xl">KSh {chargeKes}</strong></div>
      {business.status !== 'ACTIVE' && <p className="text-sm text-[#a7302d]">Your listing needs administrator approval before you can promote it.</p>}
      <button type="submit" disabled={busy || business.status !== 'ACTIVE'} className={`${button} flex w-full items-center justify-center gap-2`}><Tag className="h-5 w-5" />{busy ? 'Opening checkout…' : `Pay KSh ${chargeKes} with IntaSend`}</button>
      <p className="text-xs text-[#667064]">A one-time payment. You choose when to renew. Enter your M-Pesa PIN only in the prompt on your phone.</p>
    </form>}
  </>;
}

export default function PromoteCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2] text-[#243b32]">
    <Navbar />
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8 md:px-8"><AccountGate requiredRole="BUSINESS" slug={slug}><Checkout slug={slug} /></AccountGate></main>
    <Footer /><BottomNav />
  </div>;
}
