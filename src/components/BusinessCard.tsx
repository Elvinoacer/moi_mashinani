"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Bike, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { availabilityLabel, confirmedOpen } from "@/lib/campus-value";
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
  distanceLabel,
  onCallClick,
  onWhatsAppClick,
}: BusinessCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const now = useNow();
  const tier = effectiveTier ?? (
    business.tierEndsAt && now > 0 && Date.parse(business.tierEndsAt) <= now
      ? "NONE" : business.activeTier
  );
  const category = CATEGORIES.find((item) => item.slug === business.primaryCategory)?.name ?? "Local business";
  const zone = ZONES.find((item) => item.slug === business.zone)?.name ?? business.zone;
  const matched = comparisonItems(business, query);
  const priced = matched.filter((item) => typeof item.priceFrom === "number" && Number.isFinite(item.priceFrom));
  const lowest = priced.reduce<(typeof priced)[number] | undefined>(
    (winner, item) => !winner || item.priceFrom! < winner.priceFrom! ? item : winner, undefined,
  );
  const photo = business.coverPhoto || business.photos?.[0];
  const profileUrl = `/b/${business.slug}`;
  const contactable = business.status === "ACTIVE" && !business.isTemporarilyClosed;
  const whatsapp = contactable ? whatsappUrl(
    business.whatsapp || business.phone,
    `Hi ${business.name}, I found your listing on Moi Mashinani. Can you confirm price and availability?`,
  ) : "";
  const phone = contactable ? business.phone : "";
  const isConfirmed = confirmedOpen(business, now);
  const status = availabilityLabel(business, now);
  const detail = business.primaryCategory === "hostels-rooms" && business.utilities?.rentKes !== undefined
    ? `Rent from KES ${business.utilities.rentKes.toLocaleString("en-KE")}/month`
    : lowest
      ? `${query.trim() ? "" : "From "}KES ${lowest.priceFrom!.toLocaleString("en-KE")}`
      : "See items & prices";
  const benefit = business.utilities?.noBrokerFee ? "No broker fee"
    : business.utilities?.freeDelivery ? "Free delivery"
    : business.serviceModes.includes("delivery") ? "Delivery offered"
    : business.utilities?.hasWifi ? "Wi-Fi" : "";
  return (
    <article className={styles.card} data-tier={tier}>
      <div className={styles.main}>
        <Link href={profileUrl} className={styles.media} aria-label={`Explore ${business.name} profile and prices`}>
          {photo && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.cover} src={photo} loading="lazy" decoding="async"
              alt="" onError={() => setImageFailed(true)} />
          ) : (
            <span className={styles.fallback} aria-hidden="true"><Store size={31} /></span>
          )}
          {tier !== "NONE" && (
            <span className={styles.sponsored}>
              {tier === "FEATURED" ? "Featured · Ad" : "Recommended · Ad"}
            </span>
          )}
        </Link>
        <div className={styles.body}>
          <div className={styles.categoryRow}>
            <span className={styles.category}>{category}</span>
            {business.verificationLevel === "L2" && (
              <span className={styles.verified} title="Identity or business location verified">
                <BadgeCheck size={15} aria-hidden="true" />
                <span className={styles.srOnly}>Verified listing</span>
              </span>
            )}
          </div>
          <Link href={profileUrl} className={styles.titleLink}>
            <h3 className={styles.title}>{business.name}</h3>
          </Link>
          <p className={styles.location}><MapPin size={14} aria-hidden="true" />
            <span>{zone}{distanceLabel ? ` · ${distanceLabel}` : ""}</span>
          </p>
          <p className={styles.price} title={detail}>{detail}</p>
          {lowest && query.trim() && (
            <p className={styles.itemName} title={lowest.name}>{lowest.name}</p>
          )}
          <div className={styles.facts}>
            <span className={isConfirmed ? styles.open : styles.availability}>
              {isConfirmed && <span className={styles.dot} aria-hidden="true" />}
              {status}
            </span>
            {benefit && (
              <span className={styles.benefit}>
                {business.serviceModes.includes("delivery") && <Bike size={12} aria-hidden="true" />}
                {benefit}
              </span>
            )}
          </div>
        </div>
      </div>
      {business.studentDiscount && (
        <p className={styles.discount} title={business.studentDiscount}>
          <span>Student offer</span> {business.studentDiscount}
        </p>
      )}
      <div className={styles.actions}>
        <Link href={profileUrl} className={styles.details}>
          View prices <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer"
            aria-label={`WhatsApp ${business.name}`}
            className={styles.whatsapp}
            onClick={() => { trackBusinessEvent(business.id, "whatsapp"); onWhatsAppClick?.(); }}>
            <MessageCircle size={17} aria-hidden="true" /> WhatsApp
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className={styles.call}
            aria-label={`Call ${business.name}`}
            onClick={() => { trackBusinessEvent(business.id, "call"); onCallClick?.(); }}>
            <Phone size={18} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
