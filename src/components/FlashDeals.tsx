"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, MessageCircle, TicketPercent } from "lucide-react";
import type { FlashDeal } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useCampusZone } from "@/lib/useCampusZone";
import { countdown } from "@/lib/campus-value";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { ZONES } from "@/lib/constants";
import styles from "./FlashDeals.module.css";

type Props = {
  initial?: FlashDeal[];
  compact?: boolean;
  quietWhenEmpty?: boolean;
  maxPrice?: number;
  hideBudgetFilters?: boolean;
};

export function FlashDeals({
  initial = [],
  compact = false,
  quietWhenEmpty = false,
  maxPrice = 0,
  hideBudgetFilters = false,
}: Props) {
  const [deals, setDeals] = useState(initial);
  const [localBudget, setLocalBudget] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [handoff, setHandoff] = useState("");
  const [zone] = useCampusZone();
  const now = useNow();

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function refresh() {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const response = await fetch("/api/deals", { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not refresh deals.");
        if (!controller.signal.aborted) {
          setDeals(data);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Could not refresh deals.");
      } finally {
        running = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  const appliedBudget = hideBudgetFilters ? maxPrice : localBudget;
  const filtered = deals.filter((deal) =>
    now > 0 &&
    Date.parse(deal.endsAt) > now &&
    (!deal.dropAt || Date.parse(deal.dropAt) > now) &&
    (!appliedBudget || deal.priceKes + (deal.deliveryFeeKes || 0) <= appliedBudget) &&
    (zone === "all" || (deal.dropZone || deal.zone) === zone),
  );
  if (quietWhenEmpty && filtered.length === 0 && !error) return null;

  async function joinDrop(deal: FlashDeal) {
    if (busy) return;
    // Open the destination tab during the user gesture to avoid popup blocking.
    const chat = window.open("about:blank", "_blank");
    if (chat) chat.opener = null;
    setBusy(deal.id);
    setError("");
    try {
      const response = await fetch(`/api/deals/${deal.id}/join`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Could not join this delivery drop.");
      setDeals((current) => current.map((item) =>
        item.id === deal.id ? { ...item, joins: data.joins } : item,
      ));
      setHandoff(data.url);
      trackBusinessEvent(deal.businessId, "whatsapp");
      if (chat && !chat.closed) chat.location.href = data.url;
      else window.location.assign(data.url);
    } catch (cause) {
      chat?.close();
      setError(cause instanceof Error ? cause.message : "Could not join this delivery drop.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={styles.section} aria-label="Limited-time campus offers">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}><TicketPercent size={15} aria-hidden="true" /> Limited time</p>
          <h2 className={styles.title}>{quietWhenEmpty ? "Fresh deals & delivery drops" : "Today’s campus deals"}</h2>
          <p className={styles.description}>Offers with an expiry time. Confirm stock and final price with the seller.</p>
        </div>
        {compact && (
          <Link className={styles.seeAll} href="/deals">All deals <ArrowRight size={16} aria-hidden="true" /></Link>
        )}
      </div>
      {!compact && !hideBudgetFilters && (
        <div className={styles.budgetFilters} role="group" aria-label="Maximum total deal price">
          {([
            [0, "Any price"],
            [100, "KES 100 or less"],
            [200, "KES 200 or less"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={localBudget === value}
              onClick={() => setLocalBudget(value)}>{label}</button>
          ))}
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {handoff && (
        <a href={handoff} target="_blank" rel="noopener noreferrer" className={styles.handoff}>
          Continue last delivery enquiry on WhatsApp
        </a>
      )}
      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.slice(0, compact ? 3 : 36).map((deal) => {
            const isDrop = Boolean(deal.dropZone && deal.dropAt);
            const contact = whatsappUrl(
              deal.whatsapp,
              `Hi! I saw ${deal.title} listed for KES ${deal.priceKes.toLocaleString("en-KE")} on Moi Mashinani. Is it still available? Please confirm the total price.`,
            );
            const dropZoneName = ZONES.find((area) => area.slug === deal.dropZone)?.name || deal.dropZone;
            return (
              <article key={deal.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.timer}><Clock3 size={14} aria-hidden="true" /> {countdown(deal.endsAt, now)}</span>
                  {deal.sponsored && <span className={styles.ad}>Promoted · Ad</span>}
                </div>
                <div>
                  <h3 className={styles.cardName}>{deal.title}</h3>
                  <p className={styles.price}>KES {deal.priceKes.toLocaleString("en-KE")}</p>
                  <Link href={`/b/${deal.slug}`} className={styles.seller}>{deal.businessName}</Link>
                </div>
                {isDrop && (
                  <p className={styles.dropDetail}>
                    To <strong>{dropZoneName}</strong> ·{" "}
                    {new Date(deal.dropAt!).toLocaleTimeString("en-KE", {
                      timeZone: "Africa/Nairobi", hour: "numeric", minute: "2-digit",
                    })} EAT ·{" "}
                    <strong>{deal.deliveryFeeKes === 0 ? "Free delivery" : `Delivery KES ${deal.deliveryFeeKes || 0}`}</strong>
                    {" "}· {deal.joins} interested
                  </p>
                )}
                <div className={styles.cardFooter}>
                  {isDrop ? (
                    <button type="button" disabled={Boolean(busy)} className={styles.action}
                      onClick={() => void joinDrop(deal)}>
                      <MessageCircle size={17} aria-hidden="true" />
                      {busy === deal.id ? "Opening…" : "Join delivery drop"}
                    </button>
                  ) : contact ? (
                    <a href={contact} target="_blank" rel="noopener noreferrer" className={styles.action}
                      onClick={() => trackBusinessEvent(deal.businessId, "whatsapp")}>
                      <MessageCircle size={17} aria-hidden="true" /> Ask seller
                    </a>
                  ) : (
                    <Link href={`/b/${deal.slug}`} className={styles.action}>Contact seller <ArrowRight size={15} aria-hidden="true" /></Link>
                  )}
                  <Link className={styles.view} href={`/b/${deal.slug}`}>View shop</Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <span>{now === 0 ? "Loading current deals…" : "No limited-time offers match this area and price right now."}</span>
          <Link href="/requests">Ask Mashinani for what you need <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      )}
      {filtered.length > 0 && !compact && (
        <p className={styles.disclaimer}>
          Joining a drop records interest; WhatsApp the seller to confirm stock, payment and delivery. Budget limits include listed delivery fees.
        </p>
      )}
    </section>
  );
}
