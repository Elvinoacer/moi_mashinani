"use client";
import { useEffect, useState } from "react";
import {
  PAYMENT_PLAN_LABELS,
  PROMOTION_WEEKS,
  promotionPrice,
  type PromotionPlanId,
  type PromotionWeeks,
} from "@/lib/payments";
import type { Business, PaymentRecord } from "@/lib/types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card } from "./ui/Card";

export function BoostCheckout({ business }: { business: Business }) {
  const [plan, setPlan] = useState<PaymentRecord["planId"]>("RECOMMENDED");
  const [weeks, setWeeks] = useState<PromotionWeeks>(1);
  const [phone, setPhone] = useState(business.phone);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const pricingContext = {
    sellerType: business.sellerType,
    primaryCategory: business.primaryCategory,
  };

  const isComrade = business.sellerType === "COMRADE";
  const isHostel = business.primaryCategory === "hostels-rooms";

  const recQuote = promotionPrice("RECOMMENDED", weeks, pricingContext);
  const featQuote = promotionPrice("FEATURED", weeks, pricingContext);

  const packages = [
    {
      id: "DEAL_BLAST" as const,
      name: "24-hour deal blast",
      price: 30,
      fullPrice: 30,
      savings: 0,
      badge: "Flash Promo",
      description:
        "Put your student deal first on Deals for 24 hours; notify opted-in campus accounts.",
    },
    {
      id: "RECOMMENDED" as const,
      name: `${weeks === 12 ? "Semester (12w)" : `${weeks}-week`} Recommended`,
      price: recQuote.chargeKes,
      fullPrice: recQuote.fullPriceKes,
      savings: recQuote.savingsKes,
      badge: isComrade ? "50% Comrade Rate" : "Popular",
      description:
        "Appear above all free listings in matching category & zone results + Unlimited Request Board replies + 3-Lead Guarantee.",
    },
    {
      id: "FEATURED" as const,
      name: `${weeks === 12 ? "Semester (12w)" : `${weeks}-week`} Featured Spotlight`,
      price: featQuote.chargeKes,
      fullPrice: featQuote.fullPriceKes,
      savings: featQuote.savingsKes,
      badge: "Top 3 + Homepage",
      description:
        "Top-3 search & category placement, Homepage “Featured around campus” spotlight, Unlimited Request Board replies + 3-Lead Guarantee.",
    },
    {
      id: "PRO" as const,
      name: "Moi Mashinani Pro (30 Days)",
      price: 250,
      fullPrice: 250,
      savings: 0,
      badge: "Best All-Round",
      description:
        "A calendar month of featured zone visibility, instant Request Board student lead routing, and daily deal broadcasts.",
    },
  ];

  const totalContacts =
    (business.metrics?.calls || 0) +
    (business.metrics?.whatsapp || 0) +
    (business.metrics?.bookingRequests || 0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/payments?businessId=${business.id}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        const returned = new URLSearchParams(window.location.search).get(
          "payment",
        );
        const pending = data.find((p: PaymentRecord) =>
          returned
            ? p.id === returned
            : ["CREATED", "PENDING", "PROCESSING"].includes(p.state),
        );
        if (!controller.signal.aborted) setPayment(pending || null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Could not load payments.");
      });
    return () => controller.abort();
  }, [business.id]);

  const pendingId =
    payment && ["CREATED", "PENDING", "PROCESSING"].includes(payment.state)
      ? payment.id
      : null;

  useEffect(() => {
    if (!pendingId) return;
    const controller = new AbortController();
    let running = false;
    const started = Date.now();
    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    async function poll() {
      if (
        running ||
        document.visibilityState === "hidden" ||
        Date.now() - started > 180000
      )
        return;
      running = true;
      try {
        const response = await fetch(`/api/payments/${pendingId}/verify`, {
          method: "POST",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setPayment(data);
          setPollError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setPollError(
            cause instanceof Error
              ? cause.message
              : "Automatic check unavailable.",
          );
      } finally {
        running = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      controller.abort();
      clearInterval(timer);
      clearInterval(tick);
    };
  }, [pendingId]);

  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const effectiveWeeks =
        plan === "RECOMMENDED" || plan === "FEATURED" ? weeks : 1;
      const response = payment
        ? await fetch(`/api/payments/${payment.id}/retry`, { method: "POST" })
        : await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: business.id,
              planId: plan,
              weeks: effectiveWeeks,
              phone,
              method: "INTASEND_CHECKOUT",
            }),
          });
      const data = await response.json();
      if (data.payment) setPayment(data.payment);
      if (!response.ok || !data.checkoutUrl)
        throw new Error(data.error || "Could not open checkout.");
      window.location.assign(data.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error.");
      setBusy(false);
    }
  }

  async function verify(submitReceipt = false) {
    if (!payment || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/payments/${payment.id}/verify`, {
        method: "POST",
        ...(submitReceipt
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ receipt }),
            }
          : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPayment(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const isMultiWeekPlan = (p: string): p is PromotionPlanId =>
    p === "RECOMMENDED" || p === "FEATURED";

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#183e35]">
            Plans &amp; Promotion
          </h2>
          <p className="mt-1 text-sm text-[#50675a] leading-relaxed">
            Compare plans side-by-side. Every paid boost includes our{" "}
            <strong className="text-[#183e35]">3-Lead Value Guarantee</strong>:
            get at least 3 customer contacts during your run or we automatically
            extend your boost by 7 days free.
          </p>
        </div>
        <div className="rounded-xl border border-[#dce5d7] bg-[#f7faf5] px-4 py-3 text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#50675a]">
            Your Tracked Moi Mashinani ROI
          </p>
          <p className="mt-0.5 text-xl font-bold text-[#183e35]">
            {totalContacts} direct leads · {business.metrics?.views || 0} views
          </p>
          <p className="text-[11px] text-[#335e41]">
            Calls, WhatsApp orders &amp; bookings attributed to your profile
          </p>
        </div>
      </div>

      {isComrade && (
        <div className="rounded-xl border border-[#b7d6c2] bg-[#edf6f0] px-4 py-2.5 text-xs font-semibold text-[#1f4d35]">
          🎓 Comrade Seller Subsidy Active: You automatically get 50% off all
          Recommended and Featured weekly rates!
        </div>
      )}
      {isHostel && !isComrade && (
        <div className="rounded-xl border border-[#e3d4a5] bg-[#fdf9ec] px-4 py-2.5 text-xs font-semibold text-[#634b13]">
          🏠 Hostels &amp; Housing Category: Includes priority placement on the
          Keja Hunter map, vacancy filters, and high-ticket student booking
          leads.
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}

      {payment ? (
        <section className="space-y-4" aria-live="polite">
          <h3 className="text-xl font-bold">
            {payment.state === "COMPLETE"
              ? "Payment confirmed — package activated"
              : ["FAILED", "EXPIRED"].includes(payment.state)
                ? "Payment needs attention"
                : "Waiting for payment confirmation"}
          </h3>
          <p>
            KES {payment.amountKes} · {PAYMENT_PLAN_LABELS[payment.planId]} (
            {payment.weeks} {payment.weeks === 1 ? "week" : "weeks"})
          </p>
          <ol className="space-y-3 text-sm">
            <li>
              ✓ Checkout created for{" "}
              {payment.phone.replace(/(254\d{2})\d{4}(\d{3})/, "$1 **** $2")}.
              Enter your M-Pesa PIN only in the phone prompt.
            </li>
            <li>
              {payment.state === "COMPLETE"
                ? "✓ M-Pesa payment confirmed"
                : pendingId
                  ? elapsed < 180
                    ? `⟳ Automatically checking: ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
                    : "Confirmation is taking longer. Check again below; this payment is saved."
                  : "Payment has not completed."}
            </li>
            <li>
              {payment.state === "COMPLETE"
                ? "✓ Your purchased package is active. Refresh the dashboard to see the new dates."
                : "Your package activates after the provider confirms payment."}
            </li>
          </ol>
          {pollError && (
            <p className="text-sm">{pollError} Use Check payment below.</p>
          )}
          {payment.state === "COMPLETE" ? (
            <>
              <p className="text-sm">
                Receipt: {payment.receiptNumber || payment.id}
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh dashboard
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPayment(null);
                  setElapsed(0);
                }}
              >
                Choose another package
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void verify()}
              >
                Check payment
              </Button>
              <details className="rounded-xl border p-4">
                <summary className="cursor-pointer font-bold">
                  Didn’t receive the phone prompt?
                </summary>
                <p className="my-3 text-sm">
                  Unlock your phone, check the M-Pesa SIM, and reopen this saved
                  IntaSend checkout to retry. If you already paid, check payment
                  before retrying. Your checkout reference is {payment.apiRef}.
                </p>
                <Button disabled={busy} onClick={() => void checkout()}>
                  Reopen checkout / resend prompt
                </Button>
                <label className="mt-4 block text-sm font-bold">
                  Already paid? M-Pesa reference
                  <Input
                    value={receipt}
                    maxLength={10}
                    onChange={(e) => setReceipt(e.target.value.toUpperCase())}
                    placeholder="10-character transaction code"
                  />
                </label>
                <Button
                  variant="secondary"
                  disabled={busy || receipt.length !== 10}
                  onClick={() => void verify(true)}
                >
                  Save reference &amp; check payment
                </Button>
                {payment.submittedReceipt && (
                  <p className="mt-2 text-sm">
                    Reference {payment.submittedReceipt} saved for review. Only
                    provider confirmation activates your package.
                  </p>
                )}
              </details>
            </>
          )}
        </section>
      ) : (
        <>
          <div className="rounded-xl border border-[#dce5d7] bg-[#f7faf5] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#183e35]">
                Select Duration (for Recommended &amp; Featured boosts):
              </span>
              <div className="flex flex-wrap gap-2">
                {PROMOTION_WEEKS.map((w) => {
                  const selected = weeks === w;
                  const label =
                    w === 1
                      ? "1 Week"
                      : w === 2
                        ? "2 Weeks (-5%)"
                        : w === 4
                          ? "4 Weeks (Pay for 3!)"
                          : "12 Weeks Semester Pass (-35%)";
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeeks(w)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        selected
                          ? "bg-[#183e35] text-white shadow-sm"
                          : "bg-white text-[#244b37] border border-[#dce5d7] hover:bg-[#e9eedf]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="ui-card bg-[#f7faf5] border border-[#dce5d7] flex flex-col justify-between p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#183e35]">Free Listing</span>
                  <span className="rounded-full bg-[#e9eedf] px-2 py-0.5 text-[10px] font-bold text-[#335e41]">
                    Baseline
                  </span>
                </div>
                <p className="my-2 text-2xl font-bold text-[#183e35]">KES 0</p>
                <p className="text-xs text-[#50675a] leading-relaxed">
                  Permanent directory &amp; Comrade Market listing, customer
                  orders, 3 free Request Board lead replies/month, and free L2
                  verification.
                </p>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-[#335e41]">
                {business.activeTier === "NONE"
                  ? "● Your current active tier"
                  : "Baseline included"}
              </p>
            </div>
            {packages.map((p) => (
              <label
                className={`ui-card cursor-pointer flex flex-col justify-between p-4 ${
                  plan === p.id
                    ? "ring-2 ring-[#335e41] border-[#335e41] bg-[#fbfdf9]"
                    : "border-[#dfe5d8]"
                }`}
                key={p.id}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-full bg-[#e9eedf] px-2 py-0.5 text-[10px] font-bold text-[#244b37]">
                      {p.badge}
                    </span>
                    <input
                      type="radio"
                      name="boost-package"
                      value={p.id}
                      checked={plan === p.id}
                      onChange={() => setPlan(p.id)}
                      className="accent-[#335e41]"
                    />
                  </div>
                  <p className="mt-2 font-bold text-[#183e35] text-sm">
                    {p.name}
                  </p>
                  <div className="my-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#183e35]">
                      KES {p.price}
                    </span>
                    {p.savings > 0 && (
                      <span className="text-xs text-[#6b7d72] line-through">
                        KES {p.fullPrice}
                      </span>
                    )}
                  </div>
                  {p.savings > 0 && (
                    <p className="mb-1.5 text-[11px] font-bold text-[#1f6b3b]">
                      Save KES {p.savings} with bundle!
                    </p>
                  )}
                  <p className="text-xs text-[#50675a] leading-relaxed">
                    {p.description}
                  </p>
                </div>
                <span className="mt-3 text-[11px] font-bold text-[#244b37]">
                  {plan === p.id ? "✓ Selected for upgrade" : "Tap to select"}
                </span>
              </label>
            ))}
          </div>

          {isMultiWeekPlan(plan) && weeks > 1 && (
            <p className="text-xs font-semibold text-[#335e41]">
              ✓ {weeks}-week bundle selected for {PAYMENT_PLAN_LABELS[plan]}.
              Any remaining active boost time on your account is preserved and
              carried forward automatically.
            </p>
          )}

          {plan === "DEAL_BLAST" && !business.studentDiscount && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Add a student deal under My shop &amp; prices → details before
              buying a deal blast.
            </p>
          )}
          <label className="block text-sm font-bold">
            M-Pesa phone
            <Input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <Button
            disabled={
              busy ||
              business.status !== "ACTIVE" ||
              (plan === "DEAL_BLAST" && !business.studentDiscount)
            }
            onClick={() => void checkout()}
          >
            {busy ? "Opening checkout…" : "Continue to secure M-Pesa checkout"}
          </Button>
        </>
      )}
    </Card>
  );
}
