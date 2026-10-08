'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessCard } from '@/components/BusinessCard';
import { CATEGORIES } from '@/lib/constants';
import { Business } from '@/lib/types';
import { CategoryIcon, Store } from '@/components/icons';

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryObj = CATEGORIES.find((c) => c.slug === category) || {
    id: category,
    slug: category,
    name: category.replace(/-/g, ' ').toUpperCase(),
    icon: 'storefront',
    description: 'Services and local businesses around Moi University Main Campus.',
    color: '#183e35',
  };

  useEffect(() => {
    fetch(`/api/businesses?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        setBusinesses(data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load category businesses:', err);
        setLoading(false);
      });
  }, [category]);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20 md:pb-12">
        {/* Category Header Banner */}
        <section className="bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-5 md:p-8 flex items-start gap-4">
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-[#dfe5d8] flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${categoryObj.color}15`, color: categoryObj.color }}
          >
            <CategoryIcon slug={categoryObj.slug} className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase">
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <span>Category</span>
            </div>
            <h1 className="font-display font-black text-2xl md:text-4xl text-[#243b32] uppercase tracking-tight mt-1">
              {categoryObj.name}
            </h1>
            <p className="text-sm text-[#667064] mt-1 max-w-2xl font-body">
              {categoryObj.description}
            </p>
          </div>
        </section>

        {/* Listings in this Category */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg md:text-xl text-[#243b32] uppercase">
              {loading ? 'Finding shops...' : `${businesses.length} Verified Providers in Kesses`}
            </h2>
            <Link
              href={`/search?category=${category}`}
              className="text-xs font-bold text-[#183e35] hover:underline"
            >
              Open in Advanced Filter →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-white rounded-xl border border-[#dfe5d8] animate-pulse"></div>
              ))}
            </div>
          ) : businesses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
