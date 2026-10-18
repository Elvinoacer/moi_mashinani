"use client";

import { useEffect, useState } from "react";

type Results = {
  since: string;
  asOf: string;
  period: string;
  impressions: number;
  views: number;
  calls: number;
  whatsapp: number;
  bookings: number;
  contacts: number;
};

export function PromotionResults({ slug }: { slug: string }) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch(`/api/businesses/${encodeURIComponent(slug)}/promotion-results`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error("Promotion results are temporarily unavailable.");
        const data: Results = await response.json();
        if (!controller.signal.aborted) { setResults(data); setError(""); }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load promotion results.");
      } finally {
        pending = false;
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [slug]);

  return (
    <section className="rounded-xl border border-[#dce5d7] p-4" aria-label="Promotion results">
      <h3 className="font-bold text-[#183e35]">Your promotion results</h3>
      {error && <p role="status" className="mt-1 text-xs text-[#50675a]">{error}{results ? " Showing the last loaded results." : ""}</p>}
      {results ? <>
        <p className="mt-1 text-xs text-[#50675a]">{results.period} · {new Date(results.since).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" })}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {[["Visible impressions", results.impressions], ["Profile views", results.views], ["Contact actions", results.contacts]].map(([label, count]) => (
            <div key={label} className="rounded-lg bg-[#f7faf5] p-3">
              <dt className="text-xs text-[#50675a]">{label}</dt>
              <dd className="mt-1 text-2xl font-bold text-[#183e35]">{count}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-[#50675a]">{results.calls} Call taps · {results.whatsapp} WhatsApp taps · {results.bookings} booking requests. These actions can include repeat visitors; they do not confirm sales.</p>
        <p className="mt-1 text-[11px] text-[#50675a]">A visible impression means at least half of your card stayed on screen for one second. Results update every minute while this page is open.</p>
      </> : !error && <p role="status" className="mt-2 text-sm text-[#50675a]">Loading your measured results…</p>}
    </section>
  );
}
