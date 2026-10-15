"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Bike,
  House,
  MapPin,
  Moon,
  ShieldCheck,
  Tag,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { BusinessCard } from "@/components/BusinessCard";
import { JoinNeighborhoodCard } from "@/components/JoinNeighborhoodCard";
import { DemandModal } from "@/components/DemandModal";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { CategorySelect } from "@/components/CategorySelect";
import { Business, Tier } from "@/lib/types";
import { Search, AlertCircle, Info, X } from "@/components/icons";

const SURVIVAL_FILTERS = [
  { value: "backup", label: "Blackout / backup power", icon: Zap },
  { value: "late", label: "Open past 9 PM", icon: Moon },
  { value: "free-delivery", label: "Free zone delivery", icon: Bike },
  { value: "hostels", label: "Verified vacant kejas", icon: House },
];

interface SearchResultItem extends Business {
  effectiveTier?: Tier;
}

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") || "";
  const zoneParam = searchParams.get("zone") || "all";
  const categoryParam = searchParams.get("category") || "";
  const availableNowParam = searchParams.get("availableNow") === "true";
  const verifiedParam = searchParams.get("verified") === "true";
  const deliveryParam = searchParams.get("delivery") === "true";
  const maxPriceParam = searchParams.get("maxPrice") || "";
  const discountParam = searchParams.get("discount") === "true";
  const sortParam = searchParams.get("sort") || "best_match";

  const [searchDraft, setSearchDraft] = useState<{
    query: string;
    text: string;
  } | null>(null);
  const searchInput =
    searchDraft?.query === queryParam ? searchDraft.text : queryParam;
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [pageView, setPageView] = useState({ key: "", count: 12 });
  const filterKey = searchParams.toString();
  const visibleCount = pageView.key === filterKey ? pageView.count : 12;
  const fetching = loading || resultKey !== filterKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams.toString());
    fetch(`/api/businesses?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error || "Could not load search results. Please try again.",
          );
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults(data.results || []);
          setResultKey(params.toString());
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResultKey(params.toString());
          setError(
            err instanceof Error
              ? err.message
              : "Connection error. Please try again.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [searchParams]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") params.delete(k);
      else params.set(k, v);
    });
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() });
  };

  const activeZoneObj = ZONES.find((z) => z.slug === zoneParam);
  const activeCategoryObj = CATEGORIES.find((c) => c.slug === categoryParam);

  const clearAllFilters = () => {
    setSearchDraft(null);
    router.replace("/search", { scroll: false });
  };

  const hasActiveFilters = Boolean(
    queryParam ||
    zoneParam !== "all" ||
    categoryParam ||
    availableNowParam ||
    verifiedParam ||
    discountParam ||
    deliveryParam ||
    maxPriceParam ||
    searchParams.get("survival"),
  );

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5 pb-32 md:pb-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase"
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#243b32]">Search Directory</span>
        </nav>

        {/* SEARCH BAR & QUICK FILTERS HERO */}
        <section className="bg-white signboard-border signboard-shadow-sm rounded-2xl p-4 sm:p-6 space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="directory-search-form"
          >
            <Search className="w-5 h-5 text-[#758071] absolute left-4" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) =>
                setSearchDraft({ query: queryParam, text: e.target.value })
              }
              aria-label="Search products or services"
              placeholder="Search phone repair, chapo, salon, cyber, kibanda..."
              className="directory-query-input w-full min-w-0 pl-11 pr-4 py-3.5 bg-[#f7f8f2] border border-[#dfe5d8] rounded-xl text-[#243b32] text-base font-body focus:outline-none focus:ring-2 focus:ring-[#183e35]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft({ query: queryParam, text: "" });
                  updateFilters({ q: "" });
                }}
                className="directory-query-clear text-sm text-[#43614e] hover:underline"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="directory-query-submit bg-[#243b32] text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-[#183e35] transition-colors"
            >
              Search
            </button>
          </form>


          <details className="directory-filter-disclosure" open={hasActiveFilters ? true : undefined}>
            <summary className="directory-filter-toggle">Refine results <span className="directory-filter-toggle-hint">Area, category, budget & more filters</span></summary>
            <div className="directory-filter-panel">
          {/* CHIPS ROW (ZONES & TOGGLES) */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Zones Dropdown */}
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe5d8] bg-[#f7f8f2] px-3 text-[#243b32]">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <select
                aria-label="Campus zone"
                value={zoneParam}
                onChange={(e) => updateFilters({ zone: e.target.value })}
                className="min-w-0 bg-transparent py-1.5 text-xs font-bold focus:outline-none"
              >
                {ZONES.map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Category Select */}
            <div className="w-48">
              <CategorySelect
                value={categoryParam}
                onChange={(cat) => updateFilters({ category: cat })}
              />
            </div>

            <label className="text-xs font-bold">
              Budget cap · KES
              <input
                className="ui-input w-28"
                type="number"
                min="0"
                value={maxPriceParam}
                aria-label="Maximum price"
                onChange={(e) =>
                  updateFilters({ maxPrice: e.target.value || null })
                }
              />
            </label>
            <button
              className="directory-filter-chip"
              aria-pressed={deliveryParam}
              onClick={() =>
                updateFilters({ delivery: deliveryParam ? null : "true" })
              }
            >
              Hostel delivery
            </button>
            {/* Toggles */}
            <button
              type="button"
              onClick={() =>
                updateFilters({
                  availableNow: availableNowParam ? null : "true",
                })
              }
              className={`directory-filter-chip ${
                availableNowParam
                  ? "bg-[#183e35] text-white border-[#183e35]"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{" "}
              Open Now
            </button>

            <button
              type="button"
              onClick={() =>
                updateFilters({ verified: verifiedParam ? null : "true" })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                verifiedParam
                  ? "bg-[#183e35] text-white border-[#183e35]"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <ShieldCheck
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />{" "}
              Team Verified (L2)
            </button>

            <button
              type="button"
              onClick={() =>
                updateFilters({ discount: discountParam ? null : "true" })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                discountParam
                  ? "bg-[#183e35] text-white border-[#183e35]"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{" "}
              Student Deals
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-xs font-bold text-[#a7302d] hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

        <div
          className="flex flex-wrap gap-2"
          aria-label="Campus survival filters"
        >
          {SURVIVAL_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className="directory-filter-chip"
              aria-pressed={searchParams.get("survival") === value}
              onClick={() =>
                updateFilters({
                  survival:
                    searchParams.get("survival") === value ? null : value,
                })
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

            </div>
          </details>
        </section>

        {/* RESULTS HEADER & SORTING */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-xl md:text-2xl text-[#243b32] tracking-tight">
              {fetching ? (
                "Finding matching businesses…"
              ) : (
                <>
                  {results.length}{" "}
                  {results.length === 1 ? "business found" : "businesses found"}
                  {activeZoneObj &&
                    activeZoneObj.slug !== "all" &&
                    ` around ${activeZoneObj.name}`}
                  {activeCategoryObj && ` in ${activeCategoryObj.name}`}
                  {queryParam && ` for "${queryParam}"`}
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
            <label htmlFor="directory-sort" className="text-[#667064]">Sort by</label>
            <select
              id="directory-sort"
              value={sortParam}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="min-h-11 max-w-[205px] bg-white border border-[#dfe5d8] rounded-lg px-2.5 py-1 font-bold text-[#243b32] focus-visible:outline-2 focus-visible:outline-[#335e41]"
            >
              <option value="best_match">Recommended & Best Match</option>
              <option value="price">
                Lowest listed price (paid spots first)
              </option>
              <option value="nearest">Nearest to Gate</option>
              <option value="alphabetical">Name (A-Z)</option>
            </select>

            <button
              type="button"
              onClick={() => setRankingModalOpen(true)}
              className="text-[#667064] hover:text-[#243b32] flex items-center gap-1 font-semibold"
              title="How does ranking work?"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ranking logic</span>
            </button>
          </div>
        </div>

        {/* ERROR STATE */}
        {!fetching && error && (
          <div className="bg-white signboard-border rounded-xl p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#a7302d] mx-auto" />
            <h3 className="font-display font-bold text-base text-[#243b32]">
              {error}
            </h3>
            <button
              onClick={() => updateFilters({})}
              className="text-xs bg-[#243b32] text-white px-4 py-2 rounded-full uppercase font-bold"
            >
              Retry Search
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {fetching && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[205px] rounded-[17px] border border-[#e1e7dc] bg-[#e9eedf] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* RESULTS GRID */}
        {!fetching && !error && results.length > 0 && (
          <section aria-label="Matching business listings" className="space-y-3">
            <p role="status" className="text-xs text-[#667064]">Showing {Math.min(visibleCount, results.length)} of {results.length} listings</p>
            <div className="directory-results-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.slice(0, visibleCount).map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                query={queryParam}
                effectiveTier={biz.effectiveTier}
              />
            ))}
            </div>
            {visibleCount < results.length && (
              <button type="button" className="directory-load-more" onClick={() => setPageView({key: filterKey, count: visibleCount + 12})}>
                Show more businesses ({results.length - visibleCount} remaining)
              </button>
            )}
          </section>
        )}

        {/* ZERO RESULTS / DEMAND CAPTURE */}
        {!fetching && !error && results.length === 0 && (
          <div className="bg-white signboard-border signboard-shadow rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-[#e9eedf] rounded-full flex items-center justify-center mx-auto text-[#758071]">
              <Search className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight">
                No matching shops found
              </h2>
              <p className="text-sm text-[#667064] font-body">
                We couldn&apos;t find any businesses matching your search.
                Can&apos;t find what you need around campus? Tell us and we will
                find a fundi or shop to list!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDemandModalOpen(true)}
                className="w-full sm:w-auto bg-[#335e41] text-white px-6 py-3 rounded-full font-display font-black text-xs uppercase tracking-tight hover:bg-[#183e35] transition"
              >
                Request a Service / Shop
              </button>
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full sm:w-auto bg-[#f7f8f2] text-[#243b32] border border-[#dfe5d8] px-5 py-3 rounded-full font-bold text-xs uppercase"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        <JoinNeighborhoodCard />
      </main>

      <Footer />
      <BottomNav />

      {/* DEMAND CAPTURE MODAL */}
      {demandModalOpen && (
        <DemandModal
          initialQuery={queryParam}
          onClose={() => setDemandModalOpen(false)}
        />
      )}

      {/* HOW RANKING WORKS MODAL */}
      {rankingModalOpen && (
        <div className="fixed inset-0 bg-[#243b32]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-2xl max-w-md w-full overflow-hidden">
            <div className="bg-[#183e35] text-white p-4 flex items-center justify-between">
              <h3 className="font-display font-black text-base uppercase tracking-tight">
                How Rankings Work on MoiMashinani
              </h3>
              <button onClick={() => setRankingModalOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-4 md:p-6 text-sm text-[#243b32] space-y-3 leading-relaxed">
              <p>
                <strong>1. Relevance First:</strong> A business only appears if
                it genuinely offers what you searched for (phone technician,
                braids, cyber, etc.). Paying cannot make an irrelevant shop show
                up.
              </p>
              <p>
                <strong>2. Featured Tier:</strong> Guaranteed top placement in
                the top block of relevant results with a bright Jua Sun Yellow
                border.
              </p>
              <p>
                <strong>3. Recommended Tier:</strong> Placed above all free
                listings with a Deep Teal sticker.
              </p>
              <p>
                <strong>4. Fair Rotation:</strong> Paying businesses with equal
                match scores rotate evenly per session so every local operator
                gets fair exposure.
              </p>
              <p>
                <strong>5. Capped per page:</strong> At least 4 out of 10 slots
                are always reserved for organic local shops.
              </p>
              <button
                onClick={() => setRankingModalOpen(false)}
                className="w-full mt-4 bg-[#243b32] text-white py-2 rounded-full font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
