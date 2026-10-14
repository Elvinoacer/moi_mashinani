"use client";
import { useEffect, useState } from "react";
import { PAYMENT_PLAN_LABELS } from "@/lib/payments";
import type { Business, PaymentRecord } from "@/lib/types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card } from "./ui/Card";
const packages = [
  {
    id: "DEAL_BLAST",
    name: "24-hour deal blast",
    price: 30,
    description:
      "Put your student deal first on Deals for 24 hours; notify opted-in campus accounts.",
  },
  {
    id: "RECOMMENDED",
    name: "7-day category top spot",
    price: 100,
    description:
      "Appear above free listings in matching category and zone results.",
  },
  {
    id: "PRO",
    name: "Moi Mashinani Pro",
    price: 250,
    description:
      "A calendar month of unlimited items and image storage, stock controls and a search quality boost.",
  },
] as const;
export function BoostCheckout({ business }: { business: Business }) {
  const [plan, setPlan] = useState<PaymentRecord["planId"]>("RECOMMENDED");
  const [phone, setPhone] = useState(business.phone);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [elapsed, setElapsed] = useState(0);
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
      const response = payment
        ? await fetch(`/api/payments/${payment.id}/retry`, { method: "POST" })
        : await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: business.id,
              planId: plan,
              weeks: 1,
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
  return (
    <Card className="space-y-5">
      <h2 className="text-2xl font-bold">Boost & upgrade</h2>
      <p className="text-sm">
        One-time M-Pesa purchases. Verification is earned through evidence and
        is available on the free plan.
      </p>
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
            KES {payment.amountKes} · {PAYMENT_PLAN_LABELS[payment.planId]}
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
                  Save reference & check payment
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
          <div className="grid gap-3 md:grid-cols-3">
            {packages.map((p) => (
              <label
                className={`ui-card cursor-pointer ${plan === p.id ? "ring-2 ring-[#335e41]" : ""}`}
                key={p.id}
              >
                <input
                  type="radio"
                  name="boost-package"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id)}
                />
                <span className="ml-2 font-bold">{p.name}</span>
                <p className="my-3 text-2xl font-bold">KES {p.price}</p>
                <p className="text-sm">{p.description}</p>
              </label>
            ))}
          </div>
          {plan === "DEAL_BLAST" && !business.studentDiscount && (
            <p className="text-sm">
              Add a student deal under My shop & prices → details before buying
              a deal blast.
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
