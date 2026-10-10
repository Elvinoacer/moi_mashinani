'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessCard } from '@/components/BusinessCard';
import { JoinNeighborhoodCard } from '@/components/JoinNeighborhoodCard';
import { DemandModal } from '@/components/DemandModal';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { CategorySelect } from '@/components/CategorySelect';
import { Business, Tier } from '@/lib/types';
import { Search, AlertCircle, Info, X } from '@/components/icons';

interface SearchResultItem extends Business {
  effectiveTier?: Tier;
}

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const zoneParam = searchParams.get('zone') || 'all';
  const categoryParam = searchParams.get('category') || '';
  const availableNowParam = searchParams.get('availableNow') === 'true';
  const verifiedParam = searchParams.get('verified') === 'true';
  const discountParam = searchParams.get('discount') === 'true';
  const sortParam = searchParams.get('sort') || 'best_match';

  const [searchDraft, setSearchDraft] = useState<{ query: string; text: string } | null>(null);
  const searchInput = searchDraft?.query === queryParam ? searchDraft.text : queryParam;
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandModalOpen, setDemandModalOpen] = useState(false);
  const [rankingModalOpen, setRankingModalOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams.toString());
    fetch(`/api/businesses?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load search results. Please try again.');
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults(data.results || []);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Connection error. Please try again.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [searchParams]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') params.delete(k);
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
    router.replace('/search', { scroll: false });
  };

  const hasActiveFilters = Boolean(
    queryParam || zoneParam !== 'all' || categoryParam || availableNowParam || verifiedParam || discountParam
  );

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20 md:pb-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-[#243b32]">Search Directory</span>
        </nav>

        {/* SEARCH BAR & QUICK FILTERS HERO */}
        <section className="bg-white signboard-border signboard-shadow-sm rounded-2xl p-4 sm:p-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-5 h-5 text-[#758071] absolute left-4" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchDraft({ query: queryParam, text: e.target.value })}
              placeholder="Search phone repair, chapo, salon, cyber, kibanda..."
              className="w-full pl-12 pr-24 py-3 bg-[#f7f8f2] border border-[#dfe5d8] rounded-xl text-[#243b32] text-sm md:text-base font-body focus:outline-none focus:ring-2 focus:ring-[#183e35]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchDraft({ query: queryParam, text: '' });
                  updateFilters({ q: '' });
                }}
                className="absolute right-20 text-xs text-[#758071] hover:text-[#243b32]"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 bg-[#243b32] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-[#183e35] transition"
            >
              Search
            </button>
          </form>

          {/* CHIPS ROW (ZONES & TOGGLES) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#dfe5d8]">
            {/* Zones Dropdown */}
            <select
              value={zoneParam}
              onChange={(e) => updateFilters({ zone: e.target.value })}
              className="bg-[#f7f8f2] border border-[#dfe5d8] rounded-lg px-3 py-1.5 text-xs font-bold text-[#243b32] focus:outline-none"
            >
              {ZONES.map((z) => (
                <option key={z.slug} value={z.slug}>
                  📍 {z.name}
                </option>
              ))}
            </select>

            {/* Category Select */}
            <div className="w-48">
              <CategorySelect
                value={categoryParam}
                onChange={(cat) => updateFilters({ category: cat })}
              />
            </div>

            {/* Toggles */}
            <button
              type="button"
              onClick={() => updateFilters({ availableNow: availableNowParam ? null : 'true' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                availableNowParam
                  ? 'bg-[#183e35] text-white border-[#183e35]'
                  : 'bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]'
              }`}
            >
              🟢 Open Now
            </button>

            <button
              type="button"
              onClick={() => updateFilters({ verified: verifiedParam ? null : 'true' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                verifiedParam
                  ? 'bg-[#183e35] text-white border-[#183e35]'
                  : 'bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]'
              }`}
            >
              🛡️ Team Verified (L2)
            </button>

            <button
              type="button"
              onClick={() => updateFilters({ discount: discountParam ? null : 'true' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                discountParam
                  ? 'bg-[#183e35] text-white border-[#183e35]'
                  : 'bg-[#f7f8f2] text-[#243b32] border-[#dfe5d8] hover:bg-[#e9eedf]'
              }`}
            >
              🏷️ Student Deals
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
        </section>

        {/* RESULTS HEADER & SORTING */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-[#243b32] uppercase tracking-tight">
              {loading ? (
                'Searching campus directory...'
              ) : (
                <>
                  {results.length} {results.length === 1 ? 'business found' : 'businesses found'}
                  {activeZoneObj && activeZoneObj.slug !== 'all' && ` around ${activeZoneObj.name}`}
                  {activeCategoryObj && ` in ${activeCategoryObj.name}`}
                  {queryParam && ` for "${queryParam}"`}
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
            <span className="text-[#667064]">Sort by:</span>
            <select
              value={sortParam}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="bg-white border border-[#dfe5d8] rounded-lg px-2.5 py-1 font-bold text-[#243b32] focus:outline-none"
            >
              <option value="best_match">Recommended & Best Match</option>
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
        {error && (
          <div className="bg-white signboard-border rounded-xl p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#a7302d] mx-auto" />
            <h3 className="font-display font-bold text-base text-[#243b32]">{error}</h3>
            <button
              onClick={() => updateFilters({})}
              className="text-xs bg-[#243b32] text-white px-4 py-2 rounded-full uppercase font-bold"
            >
              Retry Search
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[465px] rounded-[22px] border border-[#e1e7dc] bg-[#e9eedf] animate-pulse" />
            ))}
          </div>
        )}

        {/* RESULTS GRID */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((biz) => (
              <BusinessCard key={biz.id} business={biz} effectiveTier={biz.effectiveTier} />
            ))}
          </div>
        )}

        {/* ZERO RESULTS / DEMAND CAPTURE */}
        {!loading && !error && results.length === 0 && (
          <div className="bg-white signboard-border signboard-shadow rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-[#e9eedf] rounded-full flex items-center justify-center mx-auto text-[#758071]">
              <Search className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight">
                No matching shops found
              </h2>
              <p className="text-sm text-[#667064] font-body">
                We couldn&apos;t find any businesses matching your search. Can&apos;t find what you need around campus? Tell us and we will find a fundi or shop to list!
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
                <strong>1. Relevance First:</strong> A business only appears if it genuinely offers what you searched for (phone technician, braids, cyber, etc.). Paying cannot make an irrelevant shop show up.
              </p>
              <p>
                <strong>2. Featured Tier:</strong> Guaranteed top placement in the top block of relevant results with a bright Jua Sun Yellow border.
              </p>
              <p>
                <strong>3. Recommended Tier:</strong> Placed above all free listings with a Deep Teal sticker.
              </p>
              <p>
                <strong>4. Fair Rotation:</strong> Paying businesses with equal match scores rotate evenly per session so every local operator gets fair exposure.
              </p>
              <p>
                <strong>5. Capped per page:</strong> At least 4 out of 10 slots are always reserved for organic local shops.
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
