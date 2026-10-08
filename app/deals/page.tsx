'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { Business } from '@/lib/types';
import { BusinessCard } from '@/components/BusinessCard';
import { CheckCircle2, Tag, Percent, ShieldCheck } from '@/components/icons';

export default function DealsAndSafetyPage() {
  const [dealBusinesses, setDealBusinesses] = useState<Business[]>([]);
  const [dealLoading, setDealLoading] = useState(true);

  useEffect(() => {
    fetch('/api/businesses?discount=true')
      .then((res) => res.json())
      .then((data) => {
        setDealBusinesses(data.results || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setDealLoading(false));
  }, []);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20 md:pb-12">
        {/* Header Banner */}
        <section className="page-hero bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-6 md:p-8">
          <div className="inline-flex items-center gap-1.5 bg-[#e9eedf] text-[#526936] text-xs font-display font-bold px-3 py-1 rounded-full border border-[#dfe5d8] mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>STUDENT PERKS & SAFETY HUB</span>
          </div>
          <h1 className="font-display font-black text-3xl md:text-5xl text-[#243b32] uppercase tracking-tight">
            Campus Deals & Trust Guide
          </h1>
          <p className="text-sm md:text-base text-[#667064] mt-2 max-w-2xl leading-relaxed font-body">
            Moi University student discounts, safety tips for hiring campus fundis, and how our L0 to L2 verification levels protect your money.
          </p>
        </section>

        {/* ACTIVE STUDENT DEALS GRID */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#526936]" />
              <span>Active Student Discounts</span>
            </h2>
            <span className="text-xs text-[#667064]">Show Student ID to claim</span>
          </div>

          {dealLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-[460px] animate-pulse rounded-[22px] border border-[#e1e7dc] bg-[#e9eedf]" />
              ))}
            </div>
          ) : dealBusinesses.length ? (
            <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {dealBusinesses.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#dce6d1] bg-white px-6 py-10 text-center">
              <Tag className="mx-auto mb-3 h-9 w-9 text-[#6f8949]" />
              <h3 className="text-lg font-bold text-[#183e35]">Fresh student deals are on their way.</h3>
              <p className="mt-2 text-sm text-[#667064]">Explore nearby businesses while owners prepare their next offers.</p>
              <Link href="/search" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#183e35] px-5 text-sm font-semibold text-white">Explore local businesses →</Link>
            </div>
          )}
        </section>

        {/* TRUST & VERIFICATION LEVELS */}
        <section className="bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#335e41]" />
              <span>How MoiMashinani Protects Students</span>
            </h2>
            <p className="text-xs md:text-sm text-[#667064] mt-1 font-body">
              Every merchant on this directory is verified through a 3-tier safety standard:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-body">
            <div className="p-4 bg-[#e9eedf] rounded-xl border border-[#dfe5d8] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#667064]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#758071]"></span>
                Level 0: Listed
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Basic Community Entry
              </h3>
              <p className="text-xs text-[#667064] leading-relaxed">
                Initial entry. Unconfirmed phone or address. Students should exercise standard caution before making large advance payments.
              </p>
            </div>

            <div className="p-4 bg-[#e9eedf] rounded-xl border border-[#dfe5d8] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#335e41]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#335e41]"></span>
                Level 1: Phone Confirmed
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Owner OTP Verified
              </h3>
              <p className="text-xs text-[#667064] leading-relaxed">
                The owner verified their Kenyan Safaricom line via SMS OTP code. The owner has answered student calls directly.
              </p>
            </div>

            <div className="p-4 bg-[#edf2e5] border-2 border-[#335e41] rounded-xl shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#335e41]">
                <CheckCircle2 className="w-4 h-4 text-[#335e41]" />
                Level 2: Team Verified
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Physical Shopfront Checked
              </h3>
              <p className="text-xs text-[#243b32] leading-relaxed">
                Physically scouted by student ambassadors. Real photos of tools/shelves, verified landmark, and confirmed prices.
              </p>
            </div>
          </div>
        </section>

        {/* 5 GOLDEN RULES FOR CAMPUS TRADE */}
        <section className="bg-[#edf2e5] border border-[#dfe5d8] rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display font-black text-2xl text-[#243b32] uppercase">
            5 Golden Rules for Hiring Campus Services
          </h2>

          <div className="space-y-3 text-sm text-[#243b32] font-body">
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>1. Inspect before full payment:</strong> Always test replaced screens, laptop keyboards, or tailored clothes before leaving the kiosk.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>2. Pay via M-Pesa Buy Goods / Till:</strong> Official till numbers provide clear transactional audit trails.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>3. Never send deposit to unverified phone numbers:</strong> For hostels or room deposits, visit in person first.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>4. Report ghost or inactive numbers:</strong> Click the three dots on any profile to report outdated contacts.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>5. Agree on diagnosis costs upfront:</strong> Confirm whether opening a phone or laptop incurs a diagnostic fee.
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
