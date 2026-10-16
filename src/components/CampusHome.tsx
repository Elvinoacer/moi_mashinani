"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Compass,
  Search,
  SlidersHorizontal,
  Bike,
  Droplets,
  GraduationCap,
  House,
  BedDouble,
  Printer,
  UtensilsCrossed,
  Wrench,
  Megaphone,
  Moon,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/types";
import { ZONES } from "@/lib/constants";
import { useCampusZone, useClientReady } from "@/lib/useCampusZone";
import { CampusZonePicker } from "./CampusZonePicker";
import { useNow } from "@/lib/useNow";
import {
  campusContext,
  survivalMatch,
  availabilityLabel,
} from "@/lib/campus-value";
import { FlashDeals } from "./FlashDeals";
import { rankBusinesses } from "@/lib/rank";
import { BusinessCard } from "./BusinessCard";
import { CategoryBrowser } from "./CategoryBrowser";
import { DemandModal } from "./DemandModal";
import { RequestBoard } from "./RequestBoard";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { JoinNeighborhoodCard } from "./JoinNeighborhoodCard";
const CAMPUS_SHORTCUTS = [
  { slug: "food-cafes", label: "Food", icon: UtensilsCrossed },
  { slug: "hostels-rooms", label: "Hostels", icon: BedDouble },
  { slug: "printing-cyber", label: "Printing", icon: Printer },
  { slug: "phone-laptop-repair", label: "Repairs", icon: Wrench },
];

const QUICK_INTENTS = [
  { value: "open", label: "Open right now", icon: Activity },
  { value: "delivery", label: "Hostel delivery", icon: Bike },
  { value: "hostels", label: "Verified rooms", icon: House },
  { value: "backup", label: "Blackout mode", icon: Zap },
  { value: "wifi", label: "Live Wi-Fi", icon: Wifi },
  { value: "water", label: "Water available", icon: Droplets },
  { value: "late", label: "Open past 9 PM", icon: Moon },
  { value: "free-delivery", label: "Free zone delivery", icon: Bike },
  { value: "comrade", label: "Comrade Market", icon: GraduationCap },
];

function buildSeeAllHref(zone: string, intent: string): string {
  const params = new URLSearchParams();
  if (zone && zone !== "all") {
    params.set("zone", zone);
  }
  if (intent === "open") {
    params.set("availableNow", "true");
  } else if (intent === "delivery") {
    params.set("delivery", "true");
  } else if (intent === "hostels") {
    params.set("category", "hostels-rooms");
    params.set("survival", "hostels");
  } else if (intent && intent !== "all") {
    params.set("survival", intent);
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function CampusHome({
  businesses: initial,
}: {
  businesses: Business[];
}) {
  const ready = useClientReady();
  const [businesses, setBusinesses] = useState(initial);
  const [zone, setZone] = useCampusZone();
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("all");
  const [moreFilters, setMoreFilters] = useState(false);
  const [post, setPost] = useState(false);
  const router = useRouter();
  const now = useNow();
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/businesses", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          setBusinesses(data.results || []);
        }
      } catch {
        /* Retain last loaded listings. */
      } finally {
        inFlight = false;
      }
    }, 30000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  const nearby = businesses.filter(
    (b) => zone === "all" || b.zone === zone || b.servesZones.includes(zone),
  );
  const live = nearby.filter(
    (b) =>
      !b.isTemporarilyClosed &&
      b.availableNowUntil &&
      Date.parse(b.availableNowUntil) > now,
  );
  const context = campusContext(now);
  const filtered = nearby.filter((b) =>
    intent === "delivery"
      ? b.serviceModes.includes("delivery")
      : survivalMatch(b, intent, now),
  );
  const ranked = rankBusinesses(
    filtered,
    "",
    zone,
    undefined,
    undefined,
    "campus",
    new Date(now),
  ).slice(0, 8);
  const contextPicks =
    now > 0
      ? rankBusinesses(
          nearby,
          context.query,
          zone,
          undefined,
          undefined,
          "pulse",
          new Date(now),
        ).slice(0, 3)
      : [];
  const activeExtraIntent = QUICK_INTENTS.slice(3).find(
    (item) => item.value === intent,
  );
  const activeZoneName =
    zone === "all"
      ? "All Kesses"
      : ZONES.find((z) => z.slug === zone)?.name || zone;
  function choose(value: string) {
    if (value === "deals") {
      router.push("/deals");
      return;
    }
    if (value === "requests") {
      setPost(true);
      return;
    }
    setIntent(value === intent ? "all" : value);
  }
  return (
    <>

      <section className="campus-home-hero" aria-labelledby="campus-home-heading">
        <div className="campus-home-hero-backdrop" aria-hidden="true">
          <Image
            src="/images/talai_stage.webp"
            alt=""
            fill
            sizes="(max-width: 1152px) 100vw, 1104px"
            preload
            className="campus-home-hero-photo"
          />
        </div>
        <div className="campus-home-hero-main">
          <span className="campus-home-eyebrow"><span className="campus-home-dot" aria-hidden="true" /> Moi University · Kesses</span>
          <h1 id="campus-home-heading">
            Find it nearby.<br /><span>Get it sorted.</span>
          </h1>
          <p className="campus-home-intro">
            <span className="campus-home-intro-desktop">Find food, hostels, shops and local services near Moi University. Compare options and contact sellers directly.</span>
            <span className="campus-home-intro-mobile">Food, hostels, shops and services around Moi. Find sellers fast.</span>
          </p>
          <form
            role="search"
            className="campus-home-search"
            onSubmit={(event) => {
              event.preventDefault();
              const params = new URLSearchParams();
              if (query.trim()) params.set("q", query.trim());
              if (zone !== "all") params.set("zone", zone);
              const qs = params.toString();
              router.push(qs ? "/search?" + qs : "/search");
            }}
          >
            <label htmlFor="landing-query" className="campus-home-search-label">What are you looking for?</label>
            <div className="campus-home-search-row">
              <div className="campus-home-search-field relative">
                <Search size={21} aria-hidden="true" />
                <Input
                  id="landing-query"
                  name="q"
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search food, hostels, printing…"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search query"
                    className="rounded-full p-1 text-stone-500 hover:bg-stone-200/70 hover:text-stone-800"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <button type="submit" className="campus-home-search-submit" aria-label="Search businesses">
                <span className="campus-home-search-submit-text">Search</span> <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          </form>
          <nav className="campus-home-popular" aria-label="Quick category shortcuts">
            <span>Quick picks</span>
            <div className="campus-home-shortcuts">
              {CAMPUS_SHORTCUTS.map(({ slug, label, icon: Icon }) => (
                <Link key={slug}
                  href={"/search?category=" + encodeURIComponent(slug) + (zone === "all" ? "" : "&zone=" + encodeURIComponent(zone))}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  <ArrowUpRight size={13} className="campus-home-shortcut-arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </nav>
        </div>
        <aside className="campus-home-hero-aside" aria-label="Search location">
          <CampusZonePicker value={zone} onChange={setZone} disabled={!ready} />
          <div className="campus-home-location-tip">
            <Compass size={19} aria-hidden="true" />
            <p>Choose a campus area to see nearby sellers, services and prices.</p>
            <Link href={"/search" + (zone === "all" ? "" : "?zone=" + encodeURIComponent(zone))}>
              Explore all businesses <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="campus-home-request" aria-labelledby="campus-request-heading">
        <div className="campus-home-request-icon" aria-hidden="true"><Megaphone size={23} /></div>
        <div className="campus-home-request-copy">
          <h2 id="campus-request-heading"><span className="campus-home-request-title-long">Can’t find it? Ask Mashinani.</span><span className="campus-home-request-title-short">Can’t find it?</span></h2>
          <p>Post what you need and let matching sellers know. No account required.</p>
        </div>
        <button type="button" className="campus-home-request-action" disabled={!ready} onClick={() => setPost(true)}>
          <span className="campus-home-request-action-long">Post a request</span><span className="campus-home-request-action-short">Post request</span> <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>

      <section className="campus-home-discovery" aria-label="Explore campus listings">
        <div className="campus-home-filter-heading">
          <div>
            <h2>Discover around you</h2>
            <p>
              Showing listings for <strong>{activeZoneName}</strong>. Make your search more specific with optional filters.
            </p>
          </div>
          {intent !== "all" && (
            <button type="button" className="campus-home-filter-reset" onClick={() => setIntent("all")}>
              Clear filters
            </button>
          )}
        </div>
        <div className="campus-home-filter-row" role="group" aria-label="Quick seller filters">
          {QUICK_INTENTS.slice(0, 3).map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" aria-pressed={intent === value}
              className="campus-home-filter-chip" onClick={() => choose(value)}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
          {!moreFilters && activeExtraIntent && (() => {
            const ExtraIcon = activeExtraIntent.icon;
            return (
              <button
                key={activeExtraIntent.value}
                type="button"
                aria-pressed={true}
                className="campus-home-filter-chip"
                onClick={() => choose(activeExtraIntent.value)}
              >
                <ExtraIcon size={17} aria-hidden="true" /> {activeExtraIntent.label}
              </button>
            );
          })()}
          <button type="button" className="campus-home-more-filters" aria-expanded={moreFilters}
            aria-controls="campus-extra-filters" onClick={() => setMoreFilters((expanded) => !expanded)}>
            <SlidersHorizontal size={17} aria-hidden="true" /> More filters
            <ChevronDown size={16} aria-hidden="true" className={moreFilters ? "rotate-180" : ""} />
          </button>
        </div>
        <div id="campus-extra-filters" className={"campus-home-filter-expand" + (moreFilters ? " is-open" : "")}
          aria-hidden={!moreFilters} inert={!moreFilters}>
          <div className="campus-home-filter-expand-inner" role="group" aria-label="More seller filters">
            {QUICK_INTENTS.slice(3).map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" aria-pressed={intent === value}
                className="campus-home-filter-chip" onClick={() => choose(value)}>
                <Icon size={17} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      {live.length > 0 && (
        <section className="space-y-3" aria-label="Live seller updates">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">Live on campus now</h2>
            <p className="text-xs text-stone-600">
              Seller updates expire after four hours. Confirm before travelling.
            </p>
          </div>
          <div className="campus-pulse">
            {live.map((b) => (
              <Link href={`/b/${b.slug}`} key={b.id} className="ui-card">
                <p className="truncate font-bold">{b.name}</p>
                <p className="my-2 text-sm">
                  {b.liveStatus || availabilityLabel(b, now)}
                </p>
                <Badge>
                  {ZONES.find((z) => z.slug === b.zone)?.name || b.zone}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="space-y-4" aria-label="Nearby businesses">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" aria-live="polite">
            {intent === "open"
              ? "Open right now"
              : intent === "delivery"
                ? "Delivering to hostels"
                : intent === "hostels"
                  ? "Verified vacant kejas · no broker fee"
                  : intent === "backup"
                    ? "Live backup power in your zone"
                    : intent === "wifi"
                      ? "Live Wi-Fi in your zone"
                      : intent === "water"
                        ? "Water available in your zone"
                        : intent === "late"
                          ? "Shops open past 9 PM & night bodas"
                          : intent === "free-delivery"
                            ? "Free delivery to your zone"
                            : intent === "comrade"
                              ? "Verified comrade sellers"
                              : "Nearby prices & sellers"}
          </h2>
          <Link
            className="text-sm underline"
            href={buildSeeAllHref(zone, intent)}
          >
            See all
          </Link>
        </div>
        {ranked.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map(({ business, effectiveTier }) => (
              <BusinessCard
                key={business.id}
                business={business}
                effectiveTier={effectiveTier}
              />
            ))}
          </div>
        ) : (
          <Card>
            <p>No listings match this area and filter yet. Try another area or clear the filter.</p>
            {intent !== "all" && <Button variant="secondary" onClick={() => setIntent("all")} className="mt-3 mr-2">Clear filter</Button>}
            <Button onClick={() => setPost(true)} className="mt-3">
              Ask sellers for what you need
            </Button>
            <Link className="ml-3 underline" href="/search">
              Explore campus
            </Link>
          </Card>
        )}
      </section>
      <section className="ui-card space-y-3">
        <h2 className="text-2xl font-bold">
          {now ? context.title : "Your campus pulse"}
        </h2>
        <p>
          {now
            ? context.description
            : "Fresh deals, instant requests and student hustles around Moi."}
        </p>
        <div className="flex flex-wrap gap-3">
          {contextPicks.map(({ business }) => (
            <Link
              className="ui-button ui-button-secondary"
              key={business.id}
              href={`/b/${business.slug}`}
            >
              {business.name} · {availabilityLabel(business, now)}
            </Link>
          ))}
          <Link href="/market" className="underline">
            Explore student hustles & declutter →
          </Link>
        </div>
      </section>
      <FlashDeals compact />
      <RequestBoard compact />
      <details className="ui-card">
        <summary className="cursor-pointer text-lg font-bold">
          Browse business categories
        </summary>
        <CategoryBrowser />
      </details>
      <JoinNeighborhoodCard />
      {post && (
        <DemandModal
          initialQuery={query}
          initialZone={zone}
          onClose={() => setPost(false)}
        />
      )}
    </>
  );
}
