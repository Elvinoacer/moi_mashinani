"use client";
import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, MessageCircle, Store } from "lucide-react";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { comparisonItems } from "@/lib/catalog-plan";
import { useNow } from "@/lib/useNow";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { whatsappUrl } from "@/lib/whatsapp";
import type { Business, Tier } from "@/lib/types";
import styles from "./BusinessCard.module.css";
interface BusinessCardProps {
  business: Business;
  query?: string;
  effectiveTier?: Tier;
  distanceLabel?: string;
  anchorCoordinates?: { lat: number; lng: number };
  showDirectionsButton?: boolean;
  onCallClick?: () => void;
  onWhatsAppClick?: () => void;
}
export function BusinessCard({
  business,
  query = "",
  effectiveTier,
  onWhatsAppClick,
}: BusinessCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const now = useNow();
  const tier =
    effectiveTier ??
    (business.tierEndsAt && Date.parse(business.tierEndsAt) <= now
      ? "NONE"
      : business.activeTier);
  const live =
    !business.isTemporarilyClosed &&
    Boolean(
      business.availableNowUntil &&
      Date.parse(business.availableNowUntil) > now,
    );
  const category =
    CATEGORIES.find((c) => c.slug === business.primaryCategory)?.name ||
    "Local business";
  const zone =
    ZONES.find((z) => z.slug === business.zone)?.name || business.zone;
  const compared = comparisonItems(business, query);
  const prices = compared
    .map((s) => s.priceFrom)
    .filter((p): p is number => p !== undefined && Number.isFinite(p));
  const min = prices.length ? Math.min(...prices) : undefined;
  const photo = business.coverPhoto || business.photos[0];
  const url = whatsappUrl(
    business.whatsapp || business.phone,
    `Hi ${business.name}! I found your price list on Moi Mashinani. Can you confirm price and availability?`,
  );
  return (
    <article className={styles.card} data-tier={tier}>
      <Link
        href={`/b/${business.slug}`}
        className={styles.media}
        aria-label={`View ${business.name} prices`}
      >
        {photo &&
        !imageFailed /* eslint-disable-next-line @next/next/no-img-element */ ? (
          <img
            src={photo}
            alt={`${business.name} in ${zone}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={styles.cover}
          />
        ) : (
          <div className={styles.fallback}>
            <Store size={40} />
            <span>Good things, nearby.</span>
          </div>
        )}
        <span className={styles.status}>
          {business.isTemporarilyClosed
            ? "Temporarily closed"
            : live
              ? "● Open now"
              : "Ask availability"}
        </span>
        {business.verificationLevel === "L2" && (
          <span
            className={styles.verified}
            title={
              business.sellerType === "COMRADE"
                ? "Student identity and campus location checked"
                : "Shop physically checked"
            }
          >
            <BadgeCheck size={14} />{" "}
            {business.sellerType === "COMRADE"
              ? "Comrade verified"
              : "Verified"}
          </span>
        )}
        {tier !== "NONE" && (
          <span className={styles.promoted}>
            {tier === "FEATURED" ? "★ Featured" : "Recommended"} · Ad
          </span>
        )}
      </Link>
      <div className={styles.body}>
        <Link href={`/b/${business.slug}`} className={styles.titleLink}>
          <h3 className={styles.title} title={business.name}>
            {business.name}
          </h3>
        </Link>
        <p className={styles.meta} title={`${category} • ${zone}`}>
          {category} • {zone}
        </p>
        <p className={styles.price}>
          {business.studentDiscount
            ? `🔥 ${business.studentDiscount}`
            : min !== undefined
              ? `${query && compared.length ? compared.find((s) => s.priceFrom === min)?.name + " · " : "From "}KES ${min.toLocaleString("en-KE")}`
              : "View prices & services"}
        </p>
        {live && business.liveStatus && (
          <p className={styles.liveNote}>{business.liveStatus}</p>
        )}
        {url &&
        business.status === "ACTIVE" &&
        !business.isTemporarilyClosed ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackBusinessEvent(business.id, "whatsapp");
              onWhatsAppClick?.();
            }}
            className={styles.action}
          >
            <MessageCircle size={17} /> WhatsApp seller
          </a>
        ) : (
          <Link href={`/b/${business.slug}`} className={styles.action}>
            View prices
          </Link>
        )}
      </div>
    </article>
  );
}
