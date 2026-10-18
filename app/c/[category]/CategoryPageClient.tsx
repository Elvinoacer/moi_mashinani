"use client";
import { CATEGORIES, ZONES } from "@/lib/constants";

import { DemandModal } from "@/components/DemandModal";
import React, { useState, useEffect, useMemo } from "react";
import Link from "@/components/MotionLink";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { BusinessCard } from "@/components/BusinessCard";
import { JoinNeighborhoodCard } from "@/components/JoinNeighborhoodCard";
import { CampusZonePicker } from "@/components/CampusZonePicker";
import { useCampusZone } from "@/lib/useCampusZone";
import { Business, Category } from "@/lib/types";
import { Bike, Search, ShieldCheck, Star, X } from "lucide-react";
import { CategoryIcon, Store } from "@/components/icons";
import { useNow } from "@/lib/useNow";
import { getEffectiveTier } from "@/lib/rank";

interface CategoryPageClientProps {
  categorySlug: string;
  categoryObj: Category;
  initialBusinesses?: Business[];
  relatedCategories?: Category[];
  popularSearches?: string[];
  initialNow: number;
}

export function CategoryPageClient({
  categorySlug,
  categoryObj,
  initialBusinesses,
  relatedCategories = [],
  popularSearches = [],
  initialNow,
}: CategoryPageClientProps) {
  const clock = useNow();
  const now = clock || initialNow;
  const [zone, setZone] = useCampusZone();
  const [keyword, setKeyword] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [fetchState, setFetchState] = useState<{
    slug: string;
    loading: boolean;
    data: Business[] | null;
    error: string;
  }>({
    slug: categorySlug,
    loading: initialBusinesses === undefined,
    data: null,
    error: "",
  });
  const [demandOpen, setDemandOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const [prevCategorySlug, setPrevCategorySlug] = useState(categorySlug);
  if (prevCategorySlug !== categorySlug) {
    setPrevCategorySlug(categorySlug);
    setVisibleCount(12);
    setKeyword("");
  }

  const businesses = useMemo(() => {
    if (initialBusinesses !== undefined) return initialBusinesses;
    if (fetchState.slug === categorySlug && fetchState.data) {
      return fetchState.data;
    }
    return [];
  }, [initialBusinesses, fetchState, categorySlug]);

  const loading =
    initialBusinesses === undefined &&
    (fetchState.loading || fetchState.slug !== categorySlug);
  const error =
    fetchState.slug === categorySlug ? fetchState.error : "";

  const searchTerms = useMemo(() => {
    return keyword.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }, [keyword]);

  const hasQuickFilters =
    searchTerms.length > 0 ||
    openNow ||
    deliveryOnly ||
    verifiedOnly;

  const hasActiveFilters = zone !== "all" || hasQuickFilters;

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      if (zone !== "all" && b.zone !== zone && !b.servesZones?.includes(zone)) {
        return false;
      }
      if (openNow) {
        const isOpen =
          !b.isTemporarilyClosed &&
          Boolean(b.availableNowUntil && new Date(b.availableNowUntil).getTime() > now);
        if (!isOpen) return false;
      }
      if (deliveryOnly && !b.serviceModes?.includes("delivery")) {
        return false;
      }
      if (verifiedOnly && b.verificationLevel !== "L2") {
        return false;
      }
      if (searchTerms.length > 0) {
        const pool = [
          b.name,
          b.tagline,
          b.description,
          b.landmark,
          ...(b.tags || []),
          ...(b.services || []).map((s) => s.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchTerms.every((term) => pool.includes(term))) {
          return false;
        }
      }
      return true;
    });
  }, [businesses, zone, openNow, deliveryOnly, verifiedOnly, searchTerms, now]);

  const activeZoneObj = ZONES.find((z) => z.slug === zone);
  const zoneLabel = zone === "all" ? "Kesses" : activeZoneObj?.name || zone;

  function clearQuickFilters() {
    setKeyword("");
    setOpenNow(false);
    setDeliveryOnly(false);
    setVerifiedOnly(false);
    setVisibleCount(12);
  }

  useEffect(() => {
    if (initialBusinesses !== undefined) return;

    const controller = new AbortController();
    fetch(`/api/businesses?category=${encodeURIComponent(categorySlug)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Could not load businesses. Please reload.",
          );
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setFetchState({
            slug: categorySlug,
            loading: false,
            data: data.results || [],
            error: "",
          });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setFetchState({
            slug: categorySlug,
            loading: false,
            data: [],
            error:
              cause instanceof Error
                ? cause.message
                : "Connection error. Please reload.",
          });
        }
      });
    return () => controller.abort();
  }, [categorySlug, initialBusinesses]);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-28 md:pb-12">
        {/* Category Header Banner */}
        <section className="page-hero bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-5 md:p-8 flex items-start gap-4">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-[#dfe5d8] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${categoryObj.color}15`,
              color: categoryObj.color,
            }}
          >
            <CategoryIcon slug={categoryObj.slug} className="w-8 h-8" />
          </div>

          <div>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase"
            >
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span>/</span>
              <Link href="/categories" className="hover:underline">
                Categories
              </Link>
              <span>/</span>
              <span className="text-[#243b32]">{categoryObj.name}</span>
            </nav>
            <h1 className="font-display font-black text-2xl md:text-4xl text-[#243b32] uppercase tracking-tight mt-1">
              {categoryObj.name} around Moi University
            </h1>
            <p className="text-sm text-[#667064] mt-1 max-w-2xl font-body">
              {categoryObj.description} Direct WhatsApp and phone contact for
              students and staff in Kesses.
            </p>
          </div>
        </section>

        {categorySlug === "hostels-rooms" && (
          <section className="rounded-2xl border border-[#bed0bd] bg-[#f0f6eb] p-5 text-[#183e35]">
            <h2 className="font-bold">Looking for a rental, or know a vacancy?</h2>
            <p className="mt-1 text-sm leading-relaxed">Use the community housing board. Posting and replying are free, without an account. Community posts are unverified: visit and check before paying.</p>
            <Link href="/housing" className="mt-3 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Browse vacancies & house seekers →</Link>
          </section>
        )}
        {/* Interactive In-category Search & Zone Filter Bar */}
        <section
          className="bg-white border border-[#dfe5d8] shadow-[0_6px_20px_#243b320a] rounded-2xl p-4 md:p-5 space-y-3.5"
          aria-label={`Filter and search ${categoryObj.name} around campus`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-center">
            {/* Campus Zone Picker */}
            <div className="min-w-0">
              <CampusZonePicker
                value={zone}
                onChange={(value) => {
                  setZone(value);
                  setVisibleCount(12);
                }}
              />
            </div>

            {/* Keyword / item search within category */}
            <div className="relative">
              <label htmlFor="category-keyword-search" className="sr-only">
                Search within {categoryObj.name}
              </label>
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#758071] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="category-keyword-search"
                type="search"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setVisibleCount(12);
                }}
                placeholder={`Search in ${categoryObj.name} (e.g. food, printing, bedsitters)…`}
                className="w-full rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] pl-10 pr-10 py-2.5 text-sm text-[#243b32] placeholder:text-[#758071] focus:bg-white focus:outline-2 focus:outline-[#335e41]"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setVisibleCount(12);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#758071] hover:text-[#243b32] rounded-full hover:bg-[#e9eedf] transition"
                  aria-label="Clear in-category search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick filter chips & active indicator */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#dfe5d8]/70">
            <span className="text-xs font-bold text-[#667064] mr-1 uppercase tracking-wider">
              Quick filters:
            </span>

            <button
              type="button"
              aria-pressed={openNow}
              onClick={() => {
                setOpenNow((prev) => !prev);
                setVisibleCount(12);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                openNow
                  ? "bg-[#335e41] text-white border-[#335e41] shadow-sm"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  openNow ? "bg-white" : "bg-[#25855a]"
                }`}
                aria-hidden="true"
              />
              Open now
            </button>

            <button
              type="button"
              aria-pressed={deliveryOnly}
              onClick={() => {
                setDeliveryOnly((prev) => !prev);
                setVisibleCount(12);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                deliveryOnly
                  ? "bg-[#335e41] text-white border-[#335e41] shadow-sm"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <Bike className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Hostel delivery
            </button>

            <button
              type="button"
              aria-pressed={verifiedOnly}
              onClick={() => {
                setVerifiedOnly((prev) => !prev);
                setVisibleCount(12);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                verifiedOnly
                  ? "bg-[#335e41] text-white border-[#335e41] shadow-sm"
                  : "bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Team verified
            </button>

            {hasQuickFilters && (
              <button
                type="button"
                onClick={clearQuickFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-[#a7302d] hover:underline px-2 py-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset filters
              </button>
            )}
          </div>
        </section>

        {/* Listings in this Category */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg md:text-xl text-[#243b32] uppercase">
              {loading
                ? "Finding shops..."
                : `${filteredBusinesses.length} ${filteredBusinesses.length === 1 ? "verified listing" : "verified listings"} in ${zoneLabel}`}
            </h2>
            <Link
              href={`/search?category=${encodeURIComponent(categorySlug)}${zone !== 'all' ? `&zone=${encodeURIComponent(zone)}` : ''}${keyword.trim() ? `&q=${encodeURIComponent(keyword.trim())}` : ''}${openNow ? '&availableNow=true' : ''}${deliveryOnly ? '&delivery=true' : ''}${verifiedOnly ? '&verified=true' : ''}`}
              className="text-xs font-bold text-[#183e35] hover:underline"
            >
              Open in Advanced Filter →
            </Link>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-white p-5 text-sm text-[#a7302d]"
            >
              {error}
            </p>
          ) : loading ? (
            <div className="directory-results-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[204px] rounded-[17px] border border-[#e1e7dc] bg-[#e9eedf] animate-pulse"
                />
              ))}
            </div>
          ) : filteredBusinesses.length > 0 ? (
            (() => {
              const featuredInCat = filteredBusinesses.filter(
                (b) => getEffectiveTier(b, new Date(now)) === "FEATURED",
              ).slice(0, 3);
              const otherBusinesses = filteredBusinesses.filter(
                (b) => !featuredInCat.some((f) => f.id === b.id),
              );

              return (
                <div className="space-y-6">
                  {featuredInCat.length > 0 && (
                    <div className="space-y-3 rounded-2xl border-2 border-[#ffc53d] bg-[#fffdf5] p-5 shadow-[0_6px_20px_rgba(255,197,61,0.15)]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ffc53d] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#243b32]">
                          <Star
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />{" "}
                          Featured Spotlight
                        </span>
                        <span className="text-xs font-bold text-[#667064]">
                          Rotating paid placements
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {featuredInCat.map((biz) => (
                          <BusinessCard key={biz.id} business={biz} effectiveTier={getEffectiveTier(biz, new Date(now))} />
                        ))}
                      </div>
                    </div>
                  )}

                  {otherBusinesses.length > 0 && (
                    <div className="space-y-3">
                      {featuredInCat.length > 0 && (
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#667064]">
                          All {categoryObj.name} in {zoneLabel} (
                          {otherBusinesses.length})
                        </h3>
                      )}
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {otherBusinesses.slice(0, visibleCount).map((biz) => (
                          <BusinessCard key={biz.id} business={biz} effectiveTier={getEffectiveTier(biz, new Date(now))} />
                        ))}
                      </div>
                      {visibleCount < otherBusinesses.length && (
                        <button type="button" className="directory-load-more" onClick={() => setVisibleCount((count) => count + 12)}>
                          Show more listings ({otherBusinesses.length - visibleCount} remaining)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#f7f8f2] border border-[#dfe5d8] flex items-center justify-center mx-auto text-[#758071]">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-xl text-[#243b32]">
                  {hasActiveFilters
                    ? `No ${categoryObj.name.toLowerCase()} found matching your filters`
                    : `No businesses listed in this category yet!`}
                </h3>
                <p className="text-sm text-[#667064] font-body max-w-md mx-auto">
                  {hasActiveFilters
                    ? `Can't find ${keyword.trim() ? `"${keyword.trim()}"` : "what you need"} in ${categoryObj.name}${zone !== "all" ? ` around ${zoneLabel}` : ""}? Post a request and local sellers or fundis will reach out via WhatsApp.`
                    : "Ask for what you need while we add providers in this category."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDemandOpen(true)}
                  className="inline-flex items-center gap-2 bg-[#183e35] text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase shadow hover:bg-[#243b32] transition"
                >
                  Post a request
                </button>
                {hasQuickFilters && (
                  <button
                    type="button"
                    onClick={clearQuickFilters}
                    className="inline-flex items-center gap-1.5 bg-[#f7f8f2] text-[#243b32] px-4 py-2.5 rounded-full font-bold text-xs uppercase border border-[#dfe5d8] hover:bg-[#e9eedf] transition"
                  >
                    Clear filters
                  </button>
                )}
                {zone !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setZone("all");
                      setVisibleCount(12);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#f7f8f2] text-[#243b32] px-4 py-2.5 rounded-full font-bold text-xs uppercase border border-[#dfe5d8] hover:bg-[#e9eedf] transition"
                  >
                    View all in Kesses
                  </button>
                )}
                <Link
                  href="/onboard"
                  className="inline-flex items-center gap-1.5 bg-[#f7f8f2] text-[#243b32] px-4 py-2.5 rounded-full font-bold text-xs uppercase border border-[#dfe5d8] hover:bg-[#e9eedf] transition"
                >
                  + List Your Shop
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="ui-card space-y-3">
          <h2 className="text-lg font-bold">
            Can’t find what you need in {categoryObj.name}?
          </h2>
          <p className="text-sm">
            Post your item, budget and preferred time. Verified sellers can
            reply.
          </p>
          <button
            className="ui-button ui-button-primary"
            onClick={() => setDemandOpen(true)}
          >
            Post a request
          </button>
        </section>
        {demandOpen && (
          <DemandModal
            initialCategory={
              CATEGORIES.some((c) => c.slug === categorySlug)
                ? categorySlug
                : ""
            }
            initialZone={zone}
            initialQuery={
              keyword.trim()
                ? `Looking for ${keyword.trim()} (${categoryObj.name.toLowerCase()}): `
                : `Looking for ${categoryObj.name.toLowerCase()}: `
            }
            onClose={() => setDemandOpen(false)}
          />
        )}
        {/* SEO CAMPUS GUIDE & LOCAL KEYWORD ENRICHMENT */}
        <section className="bg-white border border-[#dfe5d8] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="font-display font-black text-xl text-[#243b32] uppercase tracking-tight">
              Campus Neighborhood Guide: {categoryObj.name} in Kesses
            </h2>
            <p className="text-sm text-[#4a584e] leading-relaxed">
              Looking for {categoryObj.name.toLowerCase()} around Moi University
              Main Campus? MoiMashinani connects students, lecturers and
              residents directly with local providers across all campus zones.
              Whether you live in{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=soweto`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Soweto
              </Link>
              ,{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=cheboiywo`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Cheboiywo
              </Link>
              ,{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=stage`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Stage
              </Link>
              ,{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=talai`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Talai
              </Link>
              , or right next to{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=main-gate`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Main Gate
              </Link>{" "}
              and{" "}
              <Link
                href={`/search?category=${categorySlug}&zone=kesses-centre`}
                className="font-bold underline text-[#335e41] hover:text-[#183e35]"
              >
                Kesses Centre
              </Link>
              , find service hours, transparent pricing, and instant contact.
            </p>
          </div>

          {popularSearches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#667064] uppercase tracking-wider">
                Common Student Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="inline-flex items-center gap-1.5 bg-[#f7f8f2] hover:bg-[#e9eedf] text-[#243b32] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#dfe5d8] transition"
                  >
                    <Search
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {relatedCategories.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#dfe5d8]">
              <h3 className="text-xs font-bold text-[#667064] uppercase tracking-wider">
                Related Campus Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((relCat) => (
                  <Link
                    key={relCat.slug}
                    href={`/c/${relCat.slug}`}
                    className="inline-flex items-center gap-1.5 bg-[#f7f8f2] hover:bg-[#e9eedf] text-[#335e41] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#dfe5d8] transition"
                  >
                    <span>{relCat.name}</span>
                    <span className="text-[#758071]">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <JoinNeighborhoodCard />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
