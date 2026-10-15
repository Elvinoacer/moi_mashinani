"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  MapPin,
  MessageCircle,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import { FlashDeals } from "@/components/FlashDeals";
import { CampusZonePicker } from "@/components/CampusZonePicker";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { BusinessCard } from "@/components/BusinessCard";
import { JoinNeighborhoodCard } from "@/components/JoinNeighborhoodCard";
import { ZONES } from "@/lib/constants";
import { useCampusZone } from "@/lib/useCampusZone";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackBusinessEvent } from "@/lib/track-business-event";
import type { Business } from "@/lib/types";
import styles from "./deals.module.css";

type BudgetPick = {
  id: string;
  serviceId: string;
  businessId: string;
  name: string;
  price: number;
  businessName: string;
  slug: string;
  zone: string;
  servesZones: string[];
  whatsapp: string;
  photo: string;
  verified: boolean;
};

interface DealsPageClientProps {
  initialDeals?: Business[];
  initialBudget?: BudgetPick[];
}

const budgetOptions = [
  { value: 0, label: "All finds" },
  { value: 100, label: "KES 100 or less" },
  { value: 200, label: "KES 200 or less" },
] as const;

function inArea(
  item: { zone: string; servesZones?: string[] },
  zone: string,
) {
  return zone === "all" || item.zone === zone || Boolean(item.servesZones?.includes(zone));
}

function BudgetFindCard({ item }: { item: BudgetPick }) {
  const [imageFailed, setImageFailed] = useState(false);
  const zoneName = ZONES.find((area) => area.slug === item.zone)?.name || item.zone.replaceAll("-", " ");
  const itemUrl = `/b/${item.slug}#service-${encodeURIComponent(item.serviceId)}`;
  const contactUrl = whatsappUrl(item.whatsapp,
    `Hi ${item.businessName}! I saw ${item.name} from KES ${item.price.toLocaleString("en-KE")} on Moi Mashinani. Is it available, and can you confirm the final price?`);
  return (
    <article className={styles.findCard}>
      <div className={styles.findMain}>
        <Link href={itemUrl} className={styles.findMedia} aria-label={`View ${item.name} from ${item.businessName}`}>
          {item.photo && !imageFailed ? (
            <Image
              src={item.photo}
              alt=""
              fill
              sizes="(max-width: 660px) 86px, 92px"
              unoptimized
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ShoppingBag size={30} strokeWidth={1.55} aria-hidden="true" />
          )}
        </Link>
        <div className={styles.findInfo}>
          <p className={styles.findCategory}>
            {item.verified ? <BadgeCheck size={13} aria-hidden="true" /> : <Tag size={12} aria-hidden="true" />}
            {item.verified ? "Seller verified" : "Seller-listed price"}
          </p>
          <h3 className={styles.findName}>{item.name}</h3>
          <p className={styles.findPrice}>
            <span className={styles.findPriceLabel}>{item.price === 0 ? "Listed as" : "From"}</span>
            <strong>{item.price === 0 ? "Free" : `KES ${item.price.toLocaleString("en-KE")}`}</strong>
          </p>
        </div>
      </div>
      <p className={styles.findSeller} title={`${item.businessName} · ${zoneName}`}>
        <MapPin size={14} aria-hidden="true" />
        <span>{item.businessName} · {zoneName}</span>
      </p>
      <div className={styles.findFooter}>
        <Link className={styles.viewAction} href={itemUrl}>
          View item <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        {contactUrl ? (
          <a
            className={styles.contactAction}
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask ${item.businessName} about ${item.name} on WhatsApp`}
            onClick={() => trackBusinessEvent(item.businessId, "whatsapp")}
          >
            <MessageCircle size={16} aria-hidden="true" /> Ask seller
          </a>
        ) : (
          <Link className={styles.contactAction} href={itemUrl}>
            Check seller <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function DealsPageClient({
  initialDeals,
  initialBudget = [],
}: DealsPageClientProps) {
  const [zone, setZone] = useCampusZone();
  const [budget, setBudget] = useState(0);
  const [shown, setShown] = useState(6);
  const [discountShown, setDiscountShown] = useState(6);
  const [dealBusinesses, setDealBusinesses] = useState<Business[]>(initialDeals ?? []);
  const [dealLoading, setDealLoading] = useState(initialDeals === undefined);
  const [dealError, setDealError] = useState("");

  useEffect(() => {
    if (initialDeals !== undefined) return;
    const controller = new AbortController();
    fetch("/api/businesses?discount=true", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load student discounts.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) setDealBusinesses(data.results || []);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDealError(error instanceof Error ? error.message : "Unable to load student discounts.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDealLoading(false);
      });
    return () => controller.abort();
  }, [initialDeals]);

  const affordable = initialBudget.filter((item) =>
    inArea(item, zone) && (!budget || item.price <= budget),
  );
  const discounts = dealBusinesses.filter((item) => inArea(item, zone));
  const activeZone = ZONES.find((item) => item.slug === zone)?.name || "your campus area";

  function changeZone(value: string) {
    setZone(value);
    setShown(6);
    setDiscountShown(6);
  }

  function changeBudget(value: number) {
    setBudget(value);
    setShown(6);
  }

  return (
    <div className={`interior-page ${styles.page}`}>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="deals-heading">
          <div className={styles.heroContent}>
            <p className={styles.kicker}>
              <Sparkles size={15} aria-hidden="true" /> Moi University · Kesses
            </p>
            <h1 className={styles.heroTitle} id="deals-heading">
              Better deals.<br /><span>Less wandering.</span>
            </h1>
            <p className={styles.heroText}>
              Find low-priced campus essentials, student offers and delivery drops.
              See the listed price, find a seller and reach them directly.
            </p>
            <div className={styles.heroFoot}>
              <span><Check size={15} aria-hidden="true" /> Compare local prices</span>
              <span><MessageCircle size={15} aria-hidden="true" /> Contact sellers directly</span>
            </div>
          </div>
        </section>

        <section className={styles.filterBar} aria-label="Find deals near you">
          <div className={styles.zoneBlock}>
            <CampusZonePicker value={zone} onChange={changeZone} />
          </div>
          <div className={styles.budgetBlock}>
            <span className={styles.filterLabel} id="deal-price-filter-label">Filter by item price</span>
            <div className={styles.budgetRail} role="group" aria-labelledby="deal-price-filter-label">
              {budgetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={budget === option.value}
                  className={styles.budgetPill}
                  onClick={() => changeBudget(option.value)}
                >
                  {budget === option.value && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <FlashDeals compact={false} quietWhenEmpty maxPrice={budget} hideBudgetFilters />

        <section aria-labelledby="budget-finds-heading">
          <div className={styles.headingRow}>
            <div>
              <p className={styles.eyebrow}>Affordable around campus</p>
              <h2 className={styles.sectionTitle} id="budget-finds-heading">
                Everyday budget finds
              </h2>
              <p className={styles.sectionSub}>
                {budget ? `Listed from KES ${budget} or less` : "Listed from KES 300 or less"} · Ask sellers to confirm prices and stock.
              </p>
            </div>
            <span className={styles.sectionCount} role="status">
              {affordable.length} {affordable.length === 1 ? "find" : "finds"}
            </span>
          </div>
          {affordable.length > 0 ? (
            <>
              <div className={styles.cardGrid}>
                {affordable.slice(0, shown).map((item) => <BudgetFindCard key={item.id} item={item} />)}
              </div>
              {shown < affordable.length && (
                <button type="button" className={styles.moreButton} onClick={() => setShown((count) => count + 6)}>
                  Show more finds <ArrowRight size={16} aria-hidden="true" />
                  <span>({affordable.length - shown} left)</span>
                </button>
              )}
            </>
          ) : (
            <div className={styles.zero}>
              <span className={styles.zeroIcon}><ShoppingBag size={24} aria-hidden="true" /></span>
              <div>
                <h3 className={styles.zeroTitle}>No matching budget finds in {zone === "all" ? "the directory" : activeZone} yet.</h3>
                <p className={styles.zeroText}>Try another price or campus area, or ask local sellers for what you need.</p>
                <div className={styles.zeroActions}>
                  {(budget > 0 || zone !== "all") && (
                    <button type="button" className={styles.textAction} onClick={() => { setBudget(0); changeZone("all"); }}>
                      Browse all campus finds <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                  <Link href="/requests" className={styles.textAction}>Post a request <ArrowUpRight size={15} aria-hidden="true" /></Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {(dealLoading || dealError || discounts.length > 0) && (
          <section aria-labelledby="student-offers-heading">
            <div className={styles.headingRow}>
              <div>
                <p className={styles.eyebrow}>Extra value for comrades</p>
                <h2 className={styles.sectionTitle} id="student-offers-heading">Student offers</h2>
                <p className={styles.sectionSub}>These sellers advertise a student discount. Ask each seller how to claim it.</p>
              </div>
              {!dealLoading && !dealError && <span className={styles.sectionCount}>{discounts.length} offers</span>}
            </div>
            {dealError ? (
              <p role="alert" className={styles.zeroText}>{dealError}</p>
            ) : dealLoading ? (
              <div className={styles.dealGrid} aria-label="Loading student discounts">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-48 animate-pulse rounded-2xl bg-[#e8efe4] motion-reduce:animate-none" />
                ))}
              </div>
            ) : (
              <>
                <div className={styles.dealGrid}>
                  {discounts.slice(0, discountShown).map((item) => (
                    <BusinessCard key={item.id} business={item} />
                  ))}
                </div>
                {discountShown < discounts.length && (
                  <button type="button" className={styles.moreButton} onClick={() => setDiscountShown((count) => count + 6)}>
                    View more student offers <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </section>
        )}

        <details className={styles.trust}>
          <summary>
            <span className={styles.trustSymbol}><ShieldCheck size={24} aria-hidden="true" /></span>
            <span className={styles.trustLabel}>
              <strong>Shop with confidence</strong>
              <small>Verification levels, safer payments and campus trading tips</small>
            </span>
            <ChevronDown className={styles.trustChevron} size={20} aria-hidden="true" />
          </summary>
          <div className={styles.trustContent}>
            <p className="mt-3">A verification badge describes checks made by the team, not a guarantee of every transaction.</p>
            <div className={styles.trustLevels}>
              <div className={styles.trustLevel}><strong>Listed</strong><p>Business is listed; key identity or location details may be unconfirmed.</p></div>
              <div className={styles.trustLevel}><strong>Recheck needed</strong><p>Owner details have changed or a field check remains outstanding.</p></div>
              <div className={styles.trustLevel}><strong>Team verified</strong><p>A reviewer checked the shop or student identity and campus location.</p></div>
            </div>
            <h3>Before paying</h3>
            <ul>
              <li>Confirm the final price and stock directly with the seller.</li>
              <li>Inspect repairs and second-hand goods before making full payment.</li>
              <li>Visit rooms in person before sending deposits or broker fees.</li>
              <li>Request a receipt or use a traceable payment method.</li>
              <li>Report incorrect details or suspicious listings through the business profile.</li>
            </ul>
          </div>
        </details>

        <JoinNeighborhoodCard />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
