'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { calculateUpgrade } from '@/lib/payments';
import { Business, PaymentRecord } from '@/lib/types';
import { Tag, RefreshCw, CheckCircle2, AlertCircle } from '@/components/icons';

export default function PromoteCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkout state
  const [selectedPlan, setSelectedPlan] = useState<'RECOMMENDED' | 'FEATURED'>('FEATURED');
  const [weeks, setWeeks] = useState(1);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Payment execution state
  const [paymentStatus, setPaymentStatus] = useState<
    'IDLE' | 'STK_WAITING' | 'PIN_PROMPT' | 'SUCCESS' | 'FAILED'
  >('IDLE');
  const [currentPayment, setCurrentPayment] = useState<PaymentRecord | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch(`/api/businesses/${slug}`)
      .then((res) => res.json())
      .then((data: Business) => {
        setBusiness(data);
        setMpesaPhone(data.phone.replace('+', ''));
        // If already recommended, default to featured upgrade
        if (data.activeTier === 'RECOMMENDED') {
          setSelectedPlan('FEATURED');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load business for promotion:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading || !business) {
    return (
      <div className="interior-page min-h-screen flex items-center justify-center bg-[#f7f8f2]">
        <div className="bg-white p-6 signboard-border rounded-xl animate-pulse">
          Loading checkout...
        </div>
      </div>
    );
  }

  const { creditKes, chargeKes } = calculateUpgrade(business, selectedPlan, weeks);

  // Exact end date calculation
  const now = new Date();
  const currentEnds = business.tierEndsAt ? new Date(business.tierEndsAt).getTime() : 0;
  const startsAt = currentEnds > now.getTime() ? new Date(currentEnds) : now;
  const endsAt = new Date(startsAt.getTime() + weeks * 7 * 864e5);
  const formattedEndDate = endsAt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleStartStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPaymentStatus('STK_WAITING');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          planId: selectedPlan,
          weeks,
          phone: mpesaPhone,
          method: manualMode ? 'MANUAL_MPESA' : 'STK_PUSH',
          mpesaRef: manualMode ? manualCode.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to initiate M-Pesa payment');
        setPaymentStatus('FAILED');
        return;
      }

      setCurrentPayment(data.payment);

      if (manualMode) {
        // Manual payment submitted for admin
        setPaymentStatus('SUCCESS');
      } else {
        // Show simulated phone PIN prompt after 1.5 seconds
        setTimeout(() => {
          setPaymentStatus('PIN_PROMPT');
        }, 1500);
      }
    } catch {
      setErrorMessage('Network error initiating payment');
      setPaymentStatus('FAILED');
    }
  };

  const handleSimulatePinSubmit = async (pinCorrect = true) => {
    if (!currentPayment) return;

    if (!pinCorrect) {
      setErrorMessage('Wrong M-Pesa PIN entered. Please try again.');
      setPaymentStatus('FAILED');
      return;
    }

    try {
      const res = await fetch(`/api/payments/${currentPayment.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          mpesaRef: `QKH${Math.floor(10000000 + Math.random() * 90000000)}`,
        }),
      });

      const settled = await res.json();
      setCurrentPayment(settled);
      setPaymentStatus('SUCCESS');
    } catch {
      setErrorMessage('Failed to finalize payment confirmation');
      setPaymentStatus('FAILED');
    }
  };

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white signboard-border-thick rounded-xl p-5 signboard-shadow flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#667064] uppercase">Promote Merchant</div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-[#243b32] uppercase">
              {business.name}
            </h1>
          </div>
          <Link
            href={`/dashboard/${business.slug}`}
            className="text-xs font-bold text-[#667064] hover:text-[#243b32]"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {paymentStatus === 'IDLE' && (
          <form onSubmit={handleStartStkPush} className="bg-white signboard-border-thick rounded-xl p-6 signboard-shadow-lg space-y-6">
            {/* Step 1: Choose Tier */}
            <div>
              <h2 className="font-display font-bold text-lg text-[#243b32] uppercase mb-3">
                1. Select Promotion Tier
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Recommended Card */}
                <div
                  onClick={() => setSelectedPlan('RECOMMENDED')}
                  className={`p-4 rounded-xl signboard-border cursor-pointer transition-all ${
                    selectedPlan === 'RECOMMENDED'
                      ? 'border-2 border-[#335e41] bg-[#edf2e5] signboard-shadow'
                      : 'bg-white hover:bg-[#e9eedf]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#335e41] text-white font-display font-bold text-xs px-2.5 py-0.5 rounded signboard-border">
                      RECOMMENDED
                    </span>
                    <span className="font-display font-bold text-base text-[#243b32]">
                      KSh 100/wk
                    </span>
                  </div>
                  <p className="text-xs text-[#667064] leading-relaxed">
                    Ranks above all free listings in search & categories with a Deep Teal badge.
                  </p>
                </div>

                {/* Featured Card */}
                <div
                  onClick={() => setSelectedPlan('FEATURED')}
                  className={`p-4 rounded-xl signboard-border cursor-pointer transition-all ${
                    selectedPlan === 'FEATURED'
                      ? 'border-2 border-[#d9f279] bg-[#eff4da] signboard-shadow'
                      : 'bg-white hover:bg-[#e9eedf]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#d9f279] text-[#243b32] font-display font-bold text-xs px-2.5 py-0.5 rounded signboard-border">
                      FEATURED
                    </span>
                    <span className="font-display font-bold text-base text-[#243b32]">
                      KSh 200/wk
                    </span>
                  </div>
                  <p className="text-xs text-[#667064] leading-relaxed">
                    Guaranteed top block of results & homepage showcase with a vibrant Jua Yellow sticker.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Choose Duration */}
            <div>
              <h2 className="font-display font-bold text-lg text-[#243b32] uppercase mb-2">
                2. Promotion Duration
              </h2>
              <div className="flex gap-3">
                {[1, 2, 4].map((w) => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`flex-1 py-2.5 rounded-lg font-display font-bold text-sm uppercase signboard-border press-action ${
                      weeks === w
                        ? 'bg-[#243b32] text-white signboard-shadow'
                        : 'bg-[#f7f8f2] text-[#243b32]'
                    }`}
                  >
                    {w} {w === 1 ? 'Week' : 'Weeks'}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#667064]">
                Runs continuously until: <strong className="text-[#243b32]">{formattedEndDate}</strong>
              </div>
            </div>

            {/* Upgrade Credit Note if applicable */}
            {creditKes > 0 && (
              <div className="p-3 bg-[#edf2e5] signboard-border rounded-lg text-xs flex justify-between items-center text-[#183e35]">
                <span>Prorated credit from remaining Recommended days:</span>
                <span className="font-bold">- KSh {creditKes}</span>
              </div>
            )}

            {/* Total Calculation */}
            <div className="p-4 bg-[#ffffff] signboard-border rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#667064] uppercase">Total to Pay</div>
                <div className="text-xs text-[#667064]">
                  {selectedPlan} ({weeks} {weeks === 1 ? 'week' : 'weeks'})
                </div>
              </div>
              <div className="font-display font-bold text-3xl text-[#183e35]">
                KSh {chargeKes}
              </div>
            </div>

            {/* Step 3: M-Pesa Phone or Manual Mode */}
            {!manualMode ? (
              <div className="space-y-3">
                <h2 className="font-display font-bold text-lg text-[#243b32] uppercase">
                  3. Enter M-Pesa Phone Number
                </h2>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#667064]">
                    +254
                  </span>
                  <input
                    type="tel"
                    required
                    value={mpesaPhone.replace(/^254/, '')}
                    onChange={(e) => setMpesaPhone(`254${e.target.value.replace(/\D/g, '')}`)}
                    placeholder="712345678"
                    className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 pl-14 text-sm text-[#243b32] font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#667064]">
                  An official M-Pesa STK Push will be triggered to this phone immediately.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[#eff4da] signboard-border rounded-xl space-y-3">
                <div className="font-bold text-xs uppercase text-[#526936]">Manual M-Pesa Payment</div>
                <p className="text-xs text-[#526936]">
                  Send <strong>KES {chargeKes}</strong> to Buy Goods Till <strong>543210</strong> (MoiMashinani) and enter your M-Pesa transaction code below:
                </p>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SKH4929KLM"
                  className="w-full bg-white signboard-border rounded px-3 py-2 text-sm text-[#243b32] font-mono uppercase focus:outline-none"
                />
              </div>
            )}

            {/* Pay Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-[#243b32] font-display font-bold text-base uppercase py-3 rounded-full border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] press-action flex items-center justify-center gap-2"
              >
                <Tag className="w-5 h-5" />
                <span>Pay KSh {chargeKes} with M-Pesa</span>
              </button>

              <div className="flex items-center justify-between text-xs text-[#667064] pt-1">
                <span>No automatic recurring debit. You choose when to renew.</span>
                <button
                  type="button"
                  onClick={() => setManualMode(!manualMode)}
                  className="underline text-[#243b32] font-semibold"
                >
                  {manualMode ? 'Use STK Push instead' : 'Pay manually instead'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STK PUSH WAITING STATE */}
        {paymentStatus === 'STK_WAITING' && (
          <div className="bg-white border border-[#dfe5d8] rounded-2xl p-8 shadow-[0_10px_28px_#243b3212] text-center space-y-4">
            <RefreshCw className="w-12 h-12 text-[#25D366] animate-spin mx-auto" />
            <h2 className="font-display font-bold text-2xl text-[#243b32] uppercase">
              Sending M-Pesa Prompt...
            </h2>
            <p className="text-sm text-[#667064] max-w-sm mx-auto font-body">
              Please check your phone screen for the Safaricom M-Pesa prompt.
            </p>
          </div>
        )}

        {/* SIMULATED PHONE PIN PROMPT MODAL */}
        {paymentStatus === 'PIN_PROMPT' && (
          <div className="bg-[#243b32] text-white rounded-2xl p-6 signboard-border-thick signboard-shadow-lg max-w-sm mx-auto space-y-4">
            <div className="text-center space-y-1">
              <div className="text-[11px] font-mono text-[#d9f279]">M-PESA SIMULATOR</div>
              <div className="font-bold text-lg font-mono">
                Pay KSh {chargeKes}.00 to INTASEND / MOIMASHINANI
              </div>
              <div className="text-xs text-white/70">
                Enter M-PESA PIN to confirm transaction:
              </div>
            </div>

            <div className="flex justify-center">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-32 bg-white/10 text-center text-2xl tracking-widest font-mono p-2 rounded border border-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSimulatePinSubmit(false)}
                className="flex-1 bg-white/10 text-white text-xs py-2 rounded font-bold hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSimulatePinSubmit(true)}
                className="flex-1 bg-[#25D366] text-[#243b32] text-xs py-2 rounded font-bold hover:bg-[#20ba5a]"
              >
                Confirm PIN
              </button>
            </div>
          </div>
        )}

        {/* PAYMENT SUCCESS */}
        {paymentStatus === 'SUCCESS' && (
          <div className="bg-white border border-[#dfe5d8] rounded-2xl p-8 shadow-[0_10px_28px_#243b3212] text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#335e41] mx-auto" />
            <h2 className="font-display font-black text-3xl text-[#243b32] uppercase">
              Payment Successful!
            </h2>
            <p className="text-sm text-[#667064] max-w-md mx-auto font-body">
              {business.name} is now promoted as <strong>{selectedPlan}</strong> until{' '}
              <strong>{formattedEndDate}</strong>!
            </p>

            {currentPayment && (
              <div className="p-3 bg-[#edf2e5] rounded border border-[#dfe5d8] text-xs text-[#243b32] font-mono">
                Receipt: {currentPayment.receiptNumber} • Ref: {currentPayment.mpesaRef}
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/b/${business.slug}`}
                className="bg-[#243b32] text-white font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full border border-[#dfe5d8] press-action"
              >
                View Live Listing Page
              </Link>
              <Link
                href={`/dashboard/${business.slug}`}
                className="bg-[#e9eedf] text-[#243b32] font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full border border-[#dfe5d8] press-action"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* PAYMENT FAILED */}
        {paymentStatus === 'FAILED' && (
          <div className="bg-white border border-[#dfe5d8] rounded-2xl p-8 shadow-[0_10px_28px_#243b3212] text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-[#a7302d] mx-auto" />
            <h2 className="font-display font-black text-2xl text-[#a7302d] uppercase">
              Payment Incomplete
            </h2>
            <p className="text-sm text-[#667064] font-body">
              {errorMessage || 'The M-Pesa transaction was cancelled or timed out.'}
            </p>
            <button
              onClick={() => setPaymentStatus('IDLE')}
              className="bg-[#243b32] text-white font-display font-bold text-xs uppercase px-6 py-2.5 rounded-full border border-[#dfe5d8] press-action"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
