"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Plus, Search, Store, X } from "lucide-react";
import type { Business } from "@/lib/types";
import { useCampusZone } from "@/lib/useCampusZone";
import { useNow } from "@/lib/useNow";
import { publicListing, survivalMatch } from "@/lib/campus-value";
import { CampusZonePicker } from "./CampusZonePicker";
import { BusinessCard } from "./BusinessCard";
import { MarketPostForm } from "./MarketPostForm";
import { DemandModal } from "./DemandModal";
import { ModalFrame } from "./ModalFrame";
import { CampusPushOptIn } from "./CampusPushOptIn";

const types = [
  { value: "all", label: "All listings" },
  { value: "HUSTLE", label: "Student hustles" },
  { value: "DECLUTTER", label: "Second-hand" },
];

function lowestPrice(business: Business) {
  const prices = business.services
    .map((service) => service.priceFrom)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

export function ComradeMarket({ initial }: { initial: Business[] }) {
  const searchParams = useSearchParams();
  const [zone, setZone] = useCampusZone();
  const [kind, setKind] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<"recommended" | "price">("recommended");
  const [postOverride, setPostOverride] = useState<boolean | null>(null);
  const post = postOverride ?? (searchParams.get("post") === "1");
  const [ask, setAsk] = useState(false);
  const [count, setCount] = useState(12);
  const now = useNow();

  const closePostModal = () => {
    setPostOverride(false);
    if (typeof window !== "undefined" && window.location.search.includes("post=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("post");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  const term = keyword.trim().toLowerCase();
  const filtered = initial.filter((business) =>
    (survivalMatch(business, "comrade", now) ||
      (publicListing(business, now) &&
        business.sellerType === "COMRADE" &&
        business.services.some((service) => service.inStock !== false))) &&
    (zone === "all" || business.zone === zone || business.servesZones.includes(zone)) &&
    (kind === "all" || business.comradeListingKind === kind) &&
    (!term || [
      business.name, business.tagline, business.primaryCategory, ...business.tags,
      ...business.services.map((service) => service.name),
    ].join(" ").toLowerCase().includes(term))
  );
  const listings =
    sort === "price"
      ? [...filtered].sort((a, b) => lowestPrice(a) - lowestPrice(b))
      : filtered;
  return (
    <section className="space-y-5" aria-label="Comrade Market">
      <div className="page-hero rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#466d50] uppercase">Built for comrades</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#183e35]">Comrade Market</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#50675a]">
              Find student-run services and second-hand essentials near you. Sellers are verified before listing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPostOverride(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#183e35] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#315c46] shrink-0"
          >
            <Plus size={17} /> Post a free listing
          </button>
        </div>
      </div>

      {post && (
        <ModalFrame title="Post a Comrade Market listing" onClose={closePostModal}>
          <div className="p-4 sm:p-6">
            <MarketPostForm onClose={closePostModal} />
          </div>
        </ModalFrame>
      )}

      <div className="fixed bottom-20 right-4 z-30 md:hidden">
        <button
          type="button"
          onClick={() => setPostOverride(true)}
          className="flex items-center gap-2 rounded-full bg-[#183e35] px-4 py-3 text-xs font-bold text-white shadow-lg transition-transform active:scale-95"
        >
          <Plus size={16} /> Post item
        </button>
      </div>
        <>
          <div className="directory-market-toolbar">
            <label className="directory-market-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search student listings</span>
              <input type="search" value={keyword} placeholder="Search an item or hustle…"
                onChange={(event) => { setKeyword(event.target.value); setCount(12); }} />
              {keyword && (
                <button
                  type="button"
                  aria-label="Clear listing search"
                  className="rounded-full p-1 text-[#596f60] hover:bg-[#e9eedf]"
                  onClick={() => { setKeyword(""); setCount(12); }}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            <div className="directory-market-zone">
              <CampusZonePicker value={zone} onChange={(value) => { setZone(value); setCount(12); }} />
            </div>
          </div>
          <CampusPushOptIn
            variant="market"
            zone={zone}
            keyword={keyword.trim() || undefined}
            compact
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="directory-market-types" role="group" aria-label="Listing type">
              {types.map(({ value, label }) => (
                <button key={value} type="button" aria-pressed={kind === value}
                  onClick={() => { setKind(value); setCount(12); }}>
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#596f60]">
              Sort by
              <select
                className="min-h-11 rounded-lg border border-[#dfe5d8] bg-white px-2.5 font-bold text-[#243b32]"
                value={sort}
                onChange={(event) => setSort(event.target.value as "recommended" | "price")}
              >
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
              </select>
            </label>
          </div>
          <p className="text-xs font-semibold text-[#596f60]" role="status">
            Showing {Math.min(count, listings.length)} of {listings.length} student listings
          </p>
          {listings.length ? (
            <>
              <div className="directory-results-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listings.slice(0, count).map((business) => (
                  <BusinessCard key={business.id} business={business} query={keyword} />
                ))}
              </div>
              {count < listings.length && (
                <button className="directory-load-more" type="button" onClick={() => setCount((value) => value + 12)}>
                  Show more listings ({listings.length - count} remaining)
                </button>
              )}
            </>
          ) : (
            <div className="ui-card space-y-3">
              <Store className="h-7 w-7 text-[#567661]" aria-hidden="true" />
              <h2 className="font-bold">No matching student listings yet</h2>
              <p className="text-sm">Try another area or term. You can also post a request for what you need.</p>
              <div className="flex flex-wrap gap-4">
                <button type="button" className="text-sm font-bold underline" onClick={() => { setKind("all"); setKeyword(""); setZone("all"); }}>
                  Clear filters
                </button>
                <button type="button" className="inline-flex items-center gap-1 text-sm font-bold underline" onClick={() => setAsk(true)}>
                  Ask Mashinani <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      {ask && (
        <DemandModal
          initialQuery={keyword}
          initialZone={zone}
          onClose={() => setAsk(false)}
        />
      )}
    </section>
  );
}
