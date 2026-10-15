"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { FlashDeal } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useCampusZone } from "@/lib/useCampusZone";
import { countdown } from "@/lib/campus-value";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { ZONES } from "@/lib/constants";
import { Button } from "./ui/Button";
export function FlashDeals({
  initial = [],
  compact = false,
}: {
  initial?: FlashDeal[];
  compact?: boolean;
}) {
  const [deals, setDeals] = useState(initial),
    [budget, setBudget] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [handoff, setHandoff] = useState("");
  const [zone] = useCampusZone(),
    now = useNow();
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const r = await fetch("/api/deals", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setDeals(data);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not refresh deals.",
          );
      } finally {
        running = false;
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  const filtered = deals.filter(
    (d) =>
      now > 0 &&
      Date.parse(d.endsAt) > now &&
      (!d.dropAt || Date.parse(d.dropAt) > now) &&
      (!budget || d.priceKes + (d.deliveryFeeKes || 0) <= budget) &&
      (zone === "all" || (d.dropZone || d.zone) === zone),
  );
  return (
    <section
      className="space-y-4"
      aria-label="Daily flash deals and delivery drops"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          Daily flash deals & delivery drops
        </h2>
        {compact && (
          <Link href="/deals" className="underline">
            See all deals →
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Deal budget">
        {[
          [0, "Any budget"],
          [100, "Under KES 100"],
          [200, "Under KES 200"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={budget === value ? "primary" : "secondary"}
            aria-pressed={budget === value}
            onClick={() => setBudget(Number(value))}
          >
            {label}
          </Button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {handoff && (
        <a
          href={handoff}
          className="ui-button ui-button-primary"
          rel="noreferrer"
        >
          Send your order on WhatsApp
        </a>
      )}
      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, compact ? 3 : 100).map((d) => (
            <article key={d.id} className="ui-card space-y-3">
              {d.sponsored && (
                <p className="text-xs font-bold">Promoted deal</p>
              )}
              <p className="text-xs font-bold">{countdown(d.endsAt, now)}</p>
              <h3 className="text-lg font-bold">{d.title}</h3>
              <p className="text-xl font-bold">
                KES {d.priceKes.toLocaleString("en-KE")}
              </p>
              <Link href={`/b/${d.slug}`} className="text-sm underline">
                {d.businessName}
              </Link>
              {d.dropZone && d.dropAt ? (
                <>
                  <p className="text-sm">
                    Batch delivery to{" "}
                    {ZONES.find((z) => z.slug === d.dropZone)?.name ||
                      d.dropZone}{" "}
                    ·{" "}
                    {new Date(d.dropAt).toLocaleTimeString("en-KE", {
                      timeZone: "Africa/Nairobi",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    EAT
                  </p>
                  <p className="text-sm font-bold">
                    {d.deliveryFeeKes === 0
                      ? "Free zone delivery"
                      : `Delivery KES ${d.deliveryFeeKes}`}{" "}
                    · {d.joins} interested
                  </p>
                  <Button
                    disabled={busy === d.id}
                    onClick={async () => {
                      setBusy(d.id);
                      setError("");
                      try {
                        const r = await fetch(`/api/deals/${d.id}/join`, {
                          method: "POST",
                        });
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error);
                        setDeals((current) =>
                          current.map((item) =>
                            item.id === d.id
                              ? { ...item, joins: data.joins }
                              : item,
                          ),
                        );
                        setHandoff(data.url);
                        trackBusinessEvent(d.businessId, "whatsapp");
                        window.location.assign(data.url);
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Could not join.",
                        );
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    {busy === d.id ? "Joining…" : "Join drop on WhatsApp"}
                  </Button>
                </>
              ) : (
                <a
                  href={whatsappUrl(
                    d.whatsapp,
                    `I saw ${d.title} for KES ${d.priceKes} on Moi Mashinani. Is it still available?`,
                  )}
                  className="ui-button ui-button-primary"
                  rel="noreferrer"
                  onClick={() => trackBusinessEvent(d.businessId, "whatsapp")}
                >
                  Ask for this deal
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="ui-card">
          <p>
            {now === 0
              ? "Loading today’s deals…"
              : "No active drops match your zone and budget yet."}
          </p>
          <Link className="mt-3 inline-block underline" href="/requests">
            Ask Mashinani for a budget meal or delivery
          </Link>
        </div>
      )}
      <p className="text-xs">
        Joining records interest. Send your order in WhatsApp; the seller
        confirms stock and delivery. Budgets include any listed delivery fee.
      </p>
    </section>
  );
}
