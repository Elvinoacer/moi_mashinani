"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/types";
import { ZONES } from "@/lib/constants";
import { useCampusZone, useClientReady } from "@/lib/useCampusZone";
import { useNow } from "@/lib/useNow";
import { rankBusinesses } from "@/lib/rank";
import { BusinessCard } from "./BusinessCard";
import { CategoryBrowser } from "./CategoryBrowser";
import { DemandModal } from "./DemandModal";
import { RequestBoard } from "./RequestBoard";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
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
  const filtered = nearby.filter((b) =>
    intent === "open"
      ? live.some((l) => l.id === b.id)
      : intent === "delivery"
        ? b.serviceModes.includes("delivery")
        : intent === "hostels"
          ? b.primaryCategory === "hostels-rooms"
          : true,
  );
  const ranked = rankBusinesses(filtered, "", zone).slice(0, 8);
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
      <div className="campus-zone-bar">
        <label className="flex items-center gap-2 text-sm font-bold">
          📍 Your campus zone
          <select
            disabled={!ready}
            aria-label="Your campus zone"
            className="ui-input max-w-xs"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            {ZONES.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.slug === "all" ? "All campus" : z.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="space-y-4 pt-3">
        <Badge>Moi University · Kesses</Badge>
        <h1 className="text-3xl font-extrabold sm:text-5xl">
          Find it. Compare prices.
          <br />
          WhatsApp the seller.
        </h1>
        <p className="text-sm sm:text-base">
          Meals, gas, repairs, rooms and hostel hustles near you.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(query)}&zone=${zone}`);
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search products, prices or services</span>
            <Input
              id="landing-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Gas refill, braids, printing, charger…"
            />
          </label>
          <Button type="submit">Search</Button>
        </form>
        <div className="campus-pills" aria-label="Quick intents">
          {[
            ["open", "🟢 Open right now"],
            ["deals", "🔥 Today’s deals"],
            ["delivery", "🛵 Hostel delivery"],
            ["hostels", "🏠 Rooms & vacancies"],
            ["requests", "📢 Post a request"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={intent === value ? "primary" : "secondary"}
              aria-pressed={intent === value}
              onClick={() => choose(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </section>
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
                  {b.liveStatus || "Open for customers now"}
                </p>
                <Badge>
                  {ZONES.find((z) => z.slug === b.zone)?.name || b.zone}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {intent === "open"
              ? "Open right now"
              : intent === "delivery"
                ? "Delivering to hostels"
                : intent === "hostels"
                  ? "Rooms & vacancies"
                  : "Nearby prices & sellers"}
          </h2>
          <Link
            className="text-sm underline"
            href={`/search?zone=${zone}${intent === "open" ? "&availableNow=true" : intent === "delivery" ? "&delivery=true" : intent === "hostels" ? "&category=hostels-rooms" : ""}`}
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
            <p>No matching listings in this zone yet.</p>
            <Button onClick={() => setPost(true)} className="mt-3">
              Ask sellers for what you need
            </Button>
            <Link className="ml-3 underline" href="/search">
              Explore campus
            </Link>
          </Card>
        )}
      </section>
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
          List five items with prices for free. Request a free verification
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
        <DemandModal initialZone={zone} onClose={() => setPost(false)} />
      )}
    </>
  );
}
