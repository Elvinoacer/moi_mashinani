'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessCard } from '@/components/BusinessCard';
import { JoinNeighborhoodCard } from '@/components/JoinNeighborhoodCard';
import { DemandModal } from '@/components/DemandModal';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { Business, Tier } from '@/lib/types';
import { Search, CheckCircle2, Tag, AlertCircle, Info, X } from '@/components/icons';

interface SearchResultItem extends Business {
  effectiveTier?: Tier;
}

function SearchContent() {
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
    return () => {
      controller.abort();
    };
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all' || value === 'false') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (params.toString() === searchParams.toString()) return;
    setLoading(true);
    router.push(`/search?${params.toString()}`);
  };

  const currentZoneObj = ZONES.find((z) => z.slug === zoneParam) || ZONES[0];
  const currentCategoryObj = CATEGORIES.find((c) => c.slug === categoryParam);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Search header & filter strip */}

        <section className="page-hero bg-white signboard-border rounded-xl p-4 md:p-5 signboard-shadow space-y-4">
          <div className="mb-5">
            <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-[#526936]">NEIGHBORHOOD DISCOVERY · MOI UNIVERSITY</div>
            <h1 className="text-2xl font-bold tracking-tight text-[#183e35] sm:text-4xl">Find your thing. <span className="text-[#557c6a]">Closer than you think.</span></h1>
            <p className="mt-2 text-sm leading-relaxed text-[#667064]">Good food, a quick fix, a trusted local service. Your neighborhood has it.</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-[#667064] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchDraft({ query: queryParam, text: e.target.value })}
                placeholder="Search fundi, repair, braids, cyber, food..."
                className="w-full bg-[#e9eedf] signboard-border rounded-lg pl-11 pr-4 py-2.5 text-sm text-[#243b32] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#183e35] hover:bg-[#335e41] text-white font-display font-bold text-sm uppercase px-5 py-2.5 rounded-lg signboard-border signboard-shadow press-action"
            >
              Search
            </button>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Zone Selector */}
            <select
              value={zoneParam}
              onChange={(e) => updateParam('zone', e.target.value)}
              className="bg-[#e9eedf] font-bold text-[#243b32] signboard-border rounded-full px-3 py-1.5 focus:outline-none"
            >
              {ZONES.map((z) => (
                <option key={z.slug} value={z.slug}>
                  Zone: {z.name}
                </option>
              ))}
            </select>

            {/* Category Selector */}
            <select
              value={categoryParam}
              onChange={(e) => updateParam('category', e.target.value)}
              className="bg-[#e9eedf] font-bold text-[#243b32] signboard-border rounded-full px-3 py-1.5 focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Toggle: Available Now */}
            <button
              type="button"
              onClick={() => updateParam('availableNow', availableNowParam ? 'false' : 'true')}
              className={`font-bold px-3 py-1.5 rounded-full signboard-border press-action flex items-center gap-1.5 ${
                availableNowParam
                  ? 'bg-[#243b32] text-white'
                  : 'bg-[#e9eedf] text-[#243b32]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
              Available Now
            </button>

            {/* Toggle: Verified */}
            <button
              type="button"
              onClick={() => updateParam('verified', verifiedParam ? 'false' : 'true')}
              className={`font-bold px-3 py-1.5 rounded-full signboard-border press-action flex items-center gap-1 ${
                verifiedParam
                  ? 'bg-[#243b32] text-white'
                  : 'bg-[#e9eedf] text-[#243b32]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#335e41]" />
              Verified
            </button>

            {/* Toggle: Student Deals */}
            <button
              type="button"
              onClick={() => updateParam('discount', discountParam ? 'false' : 'true')}
              className={`font-bold px-3 py-1.5 rounded-full signboard-border press-action flex items-center gap-1 ${
                discountParam
                  ? 'bg-[#526936] text-white'
                  : 'bg-[#e9eedf] text-[#243b32]'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Student Deals
            </button>

            {/* Clear filters */}
            {(queryParam || categoryParam || zoneParam !== 'all' || availableNowParam || verifiedParam || discountParam) && (
              <button
                type="button"
                onClick={() => router.push('/search')}
                className="text-[#a7302d] font-bold hover:underline px-2 py-1"
              >
                Reset All
              </button>
            )}
          </div>
        </section>

        {error && <p role="alert" className="rounded bg-[#fce7e1] p-4 text-sm text-[#a7302d]">{error}</p>}
        {/* Results summary & sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <div>
            <span className="font-bold text-[#243b32] font-display text-lg">
              {loading ? 'Searching...' : `${results.length} results`}
            </span>
            {queryParam && (
              <span className="text-[#667064]"> for &ldquo;{queryParam}&rdquo;</span>
            )}
            <span className="text-[#667064]"> near </span>
            <span className="font-bold text-[#243b32]">{currentZoneObj.name}</span>
            {currentCategoryObj && (
              <span className="text-[#667064]"> in {currentCategoryObj.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRankingModalOpen(true)}
              className="text-xs text-[#667064] underline decoration-dotted hover:text-[#243b32]"
            >
              How ranking works
            </button>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#667064]">Sort:</span>
              <select
                value={sortParam}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-white font-bold text-[#243b32] signboard-border rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="best_match">Best Match</option>
                <option value="nearest">Nearest (Walk Time)</option>
                <option value="newest">Newest Listed</option>
              </select>
            </div>
          </div>
        </div>

        {/* RESULTS LIST */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[465px] rounded-[22px] border border-[#e1e7dc] bg-[#e9eedf] animate-pulse"></div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                effectiveTier={biz.effectiveTier}
                anchorCoordinates={currentZoneObj.center}
                showDirectionsButton={true}
              />
            ))}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="bg-white signboard-border-thick rounded-xl p-8 text-center space-y-4 signboard-shadow">
            <AlertCircle className="w-12 h-12 text-[#758071] mx-auto" />
            <h3 className="font-display font-bold text-2xl text-[#243b32] uppercase">
              Nothing matched &ldquo;{queryParam || 'your search'}&rdquo; near {currentZoneObj.name}
            </h3>
            <p className="text-sm text-[#667064] max-w-md mx-auto">
              We couldn&apos;t find an active listing for this search. Try searching across all zones or tell our campus scouts what you need!
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => updateParam('zone', 'all')}
                className="bg-[#243b32] text-white text-xs font-bold px-4 py-2 rounded-full signboard-border press-action"
              >
                Search All Campus Zones
              </button>
              <Link
                href="/"
                className="bg-[#f7f8f2] text-[#243b32] text-xs font-bold px-4 py-2 rounded-full signboard-border press-action"
              >
                Browse Categories
              </Link>
              <button
                type="button"
                onClick={() => setDemandModalOpen(true)}
                className="bg-[#183e35] text-white text-xs font-bold px-4 py-2 rounded-full signboard-border press-action"
              >
                Tell Us What You Need
              </button>
            </div>
          </div>
        )}

        <JoinNeighborhoodCard />

        {/* BOTTOM PROMOTED DISCLOSURE */}
        <div className="p-3 bg-[#edf2e5] rounded signboard-border text-xs text-[#667064] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#335e41] flex-shrink-0" />
            <span>
              Featured and Recommended listings are promoted by local owners. Promoted shops never outrank better matches for queries they do not serve.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRankingModalOpen(true)}
            className="font-bold text-[#243b32] underline shrink-0 ml-2"
          >
            Learn more
          </button>
        </div>
      </main>

      <Footer />
      <BottomNav />

      {demandModalOpen && (
        <DemandModal
          initialQuery={queryParam}
          onClose={() => setDemandModalOpen(false)}
        />
      )}

      {/* HOW RANKING WORKS MODAL */}
      {rankingModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#243b32]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#edf2e5] px-4 py-3 border-b-2 border-[#dfe5d8] flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#243b32] uppercase">
                How MoiMashinani Ranking Works
              </h3>
              <button onClick={() => setRankingModalOpen(false)}>
                <X className="w-5 h-5 text-[#243b32]" />
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading directory...</div>}>
      <SearchContent />
    </Suspense>
  );
}
