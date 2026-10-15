"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Search, Store } from "lucide-react";
import type { Business } from "@/lib/types";
import { useCampusZone } from "@/lib/useCampusZone";
import { useNow } from "@/lib/useNow";
import { survivalMatch } from "@/lib/campus-value";
import { CampusZonePicker } from "./CampusZonePicker";
import { BusinessCard } from "./BusinessCard";
import { MarketPostForm } from "./MarketPostForm";

const types = [
  { value: "all", label: "All listings" },
  { value: "HUSTLE", label: "Student hustles" },
  { value: "DECLUTTER", label: "Second-hand" },
];

export function ComradeMarket({ initial }: { initial: Business[] }) {
  const [zone, setZone] = useCampusZone();
  const [kind, setKind] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [post, setPost] = useState(false);
  const [count, setCount] = useState(12);
  const now = useNow();
  const term = keyword.trim().toLowerCase();
  const listings = initial.filter((business) =>
    survivalMatch(business, "comrade", now) &&
    (zone === "all" || business.zone === zone || business.servesZones.includes(zone)) &&
    (kind === "all" || business.comradeListingKind === kind) &&
    (!term || [
      business.name, business.tagline, business.primaryCategory, ...business.tags,
      ...business.services.map((service) => service.name),
    ].join(" ").toLowerCase().includes(term))
  );
  return (
    <section className="space-y-5" aria-label="Comrade Market">
      <div className="page-hero rounded-2xl p-5 sm:p-7">
        <p className="text-xs font-bold tracking-widest text-[#466d50] uppercase">Built for comrades</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#183e35]">Comrade Market</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#50675a]">
          Find student-run services and second-hand essentials near you. Sellers are verified before listing.
        </p>
        <button type="button" onClick={() => setPost((previous) => !previous)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#183e35] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#315c46]">
          {post ? <><ArrowLeft size={17} /> Back to listings</> : <><Plus size={17} /> Post a free listing</>}
        </button>
      </div>
      {post ? (
        <div className="directory-form-enter"><MarketPostForm /></div>
      ) : (
        <>
          <div className="directory-market-toolbar">
            <label className="directory-market-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search student listings</span>
              <input type="search" value={keyword} placeholder="Search an item or hustle…"
                onChange={(event) => { setKeyword(event.target.value); setCount(12); }} />
            </label>
            <div className="directory-market-zone">
              <CampusZonePicker value={zone} onChange={(value) => { setZone(value); setCount(12); }} />
            </div>
          </div>
          <div className="directory-market-types" role="group" aria-label="Listing type">
            {types.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={kind === value}
                onClick={() => { setKind(value); setCount(12); }}>
                {label}
              </button>
            ))}
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
                <Link className="inline-flex items-center gap-1 text-sm font-bold underline" href="/requests">
                  Ask Mashinani <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
