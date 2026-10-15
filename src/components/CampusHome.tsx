"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  Megaphone,
  Moon,
  Wifi,
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
        <div className="campus-home-hero-main">
          <span className="campus-home-eyebrow"><span className="campus-home-dot" aria-hidden="true" /> Moi Mashinani · Made for Moi University, Kesses</span>
          <h1 id="campus-home-heading">
            Find it nearby.<br /><span>Get it sorted.</span>
          </h1>
          <p className="campus-home-intro">
            Moi Mashinani connects students with food, hostels, repairs, printing and
            other local businesses around Moi University. Compare prices and
            contact sellers directly — all in one place.
          </p>
          <form
            role="search"
            className="campus-home-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              const params = new URLSearchParams({ q: query.trim() });
              if (zone !== "all") params.set("zone", zone);
              router.push("/search?" + params.toString());
            }}
          >
            <label htmlFor="landing-query" className="campus-home-search-label">What are you looking for?</label>
            <div className="campus-home-search-row">
              <div className="campus-home-search-field">
                <Search size={21} aria-hidden="true" />
                <Input
                  id="landing-query"
                  name="q"
                  type="search"
                  enterKeyHint="search"
                  required
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. Gas refill, braids, printing…"
                />
              </div>
              <button type="submit" className="campus-home-search-submit">
                Search <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          </form>
          <div className="campus-home-popular">
            <span>Popular:</span>
            {["Food", "Hostels", "Printing", "Phone repairs"].map((term) => (
              <Link
                key={term}
                href={"/search?q=" + encodeURIComponent(term) + (zone === "all" ? "" : "&zone=" + encodeURIComponent(zone))}
              >
                {term} <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            ))}
          </div>
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
          <h2 id="campus-request-heading">Can’t find it? Ask Mashinani.</h2>
          <p>Post what you need and let matching sellers know. No account required.</p>
        </div>
        <button type="button" className="campus-home-request-action" disabled={!ready} onClick={() => setPost(true)}>
          Post a request <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>

      <section className="campus-home-discovery" aria-label="Explore campus listings">
        <div className="campus-home-filter-heading">
          <div>
            <h2>Discover around you</h2>
            <p>Make your search more specific with optional filters.</p>
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
            href={`/search?zone=${zone}&survival=${intent}${intent === "open" ? "&availableNow=true" : intent === "delivery" ? "&delivery=true" : intent === "hostels" ? "&category=hostels-rooms" : ""}`}
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
      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Live on campus now</h2>
          <p className="text-xs">
            Seller updates expire after four hours. Confirm before travelling.
          </p>
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
      <RequestBoard compact />
      <details className="ui-card">
        <summary className="cursor-pointer text-lg font-bold">
          Browse business categories
        </summary>
        <CategoryBrowser />
      </details>
      <Card>
        <h2 className="text-xl font-bold">Have a shop or a hostel hustle?</h2>
        <p className="my-3 text-sm">
          List unlimited items with prices for free. Request a free verification
          visit and let students find you.
        </p>
        <Link className="ui-button ui-button-primary" href="/onboard">
          List your business free
        </Link>
        <Link className="ml-4 inline-block text-sm underline" href="/dashboard">
          Manage my shop
        </Link>
      </Card>
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
