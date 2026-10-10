'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessCard } from '@/components/BusinessCard';
import { JoinNeighborhoodCard } from '@/components/JoinNeighborhoodCard';
import { Business, Category } from '@/lib/types';
import { CategoryIcon, Store } from '@/components/icons';

interface CategoryPageClientProps {
  categorySlug: string;
  categoryObj: Category;
  initialBusinesses?: Business[];
  relatedCategories?: Category[];
  popularSearches?: string[];
}

export function CategoryPageClient({
  categorySlug,
  categoryObj,
  initialBusinesses,
  relatedCategories = [],
  popularSearches = [],
}: CategoryPageClientProps) {
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses ?? []);
  const [loading, setLoading] = useState(initialBusinesses === undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialBusinesses !== undefined) return;

    const controller = new AbortController();
    fetch(`/api/businesses?category=${encodeURIComponent(categorySlug)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load businesses. Please reload.');
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setBusinesses(data.results || []);
          setError('');
          setLoading(false);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Connection error. Please reload.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [categorySlug, initialBusinesses]);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-20 md:pb-12">
        {/* Category Header Banner */}
        <section className="page-hero bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-5 md:p-8 flex items-start gap-4">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-[#dfe5d8] flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${categoryObj.color}15`, color: categoryObj.color }}
          >
            <CategoryIcon slug={categoryObj.slug} className="w-8 h-8" />
          </div>

          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/categories" className="hover:underline">Categories</Link>
              <span>/</span>
              <span className="text-[#243b32]">{categoryObj.name}</span>
            </nav>
            <h1 className="font-display font-black text-2xl md:text-4xl text-[#243b32] uppercase tracking-tight mt-1">
              {categoryObj.name} around Moi University
            </h1>
            <p className="text-sm text-[#667064] mt-1 max-w-2xl font-body">
              {categoryObj.description} Direct WhatsApp and phone contact for students and staff in Kesses.
            </p>
          </div>
        </section>

        {/* Listings in this Category */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg md:text-xl text-[#243b32] uppercase">
              {loading ? 'Finding shops...' : `${businesses.length} verified listings in Kesses`}
            </h2>
            <Link
              href={`/search?category=${categorySlug}`}
              className="text-xs font-bold text-[#183e35] hover:underline"
            >
              Open in Advanced Filter →
            </Link>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-white p-5 text-sm text-[#a7302d]">{error}</p>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[465px] rounded-[22px] border border-[#e1e7dc] bg-[#e9eedf] animate-pulse" />
              ))}
            </div>
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {businesses.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] text-center space-y-3">
              <Store className="w-12 h-12 text-[#758071] mx-auto" />
              <h3 className="font-display font-bold text-xl text-[#243b32]">
                No businesses listed in this category yet!
              </h3>
              <p className="text-sm text-[#667064] font-body">
                Be the first to list your business here for free.
              </p>
              <Link
                href="/onboard"
                className="inline-block bg-[#335e41] text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] press-action"
              >
                + List Your Shop
              </Link>
            </div>
          )}
        </section>

        {/* SEO CAMPUS GUIDE & LOCAL KEYWORD ENRICHMENT */}
        <section className="bg-white border border-[#dfe5d8] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="font-display font-black text-xl text-[#243b32] uppercase tracking-tight">
              Campus Neighborhood Guide: {categoryObj.name} in Kesses
            </h2>
            <p className="text-sm text-[#4a584e] leading-relaxed">
              Looking for {categoryObj.name.toLowerCase()} around Moi University Main Campus? MoiMashinani connects students, lecturers and residents directly with local providers across all campus zones. Whether you live in <Link href={`/search?category=${categorySlug}&zone=soweto`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Soweto</Link>, <Link href={`/search?category=${categorySlug}&zone=cheboiywo`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Cheboiywo</Link>, <Link href={`/search?category=${categorySlug}&zone=stage`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Stage</Link>, <Link href={`/search?category=${categorySlug}&zone=talai`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Talai</Link>, or right next to <Link href={`/search?category=${categorySlug}&zone=main-gate`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Main Gate</Link> and <Link href={`/search?category=${categorySlug}&zone=kesses-centre`} className="font-bold underline text-[#335e41] hover:text-[#183e35]">Kesses Centre</Link>, find service hours, transparent pricing, and instant contact.
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
                    className="inline-block bg-[#f7f8f2] hover:bg-[#e9eedf] text-[#243b32] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#dfe5d8] transition"
                  >
                    🔍 {term}
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
