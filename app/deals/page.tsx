'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { Business } from '@/lib/types';
import { CheckCircle2, Tag, Percent, ShieldCheck } from '@/components/icons';

export default function DealsAndSafetyPage() {
  const [dealBusinesses, setDealBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    fetch('/api/businesses?discount=true')
      .then((res) => res.json())
      .then((data) => {
        setDealBusinesses(data.results || []);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F8]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20 md:pb-12">
        {/* Header Banner */}
        <section className="bg-white border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] rounded-2xl p-6 md:p-8">
          <div className="inline-flex items-center gap-1.5 bg-[#FFDEA0] text-[#795900] text-xs font-display font-bold px-3 py-1 rounded-full border border-[#001C3B] mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>STUDENT PERKS & SAFETY HUB</span>
          </div>
          <h1 className="font-display font-black text-3xl md:text-5xl text-[#001C3B] uppercase tracking-tight">
            Campus Deals & Trust Guide
          </h1>
          <p className="text-sm md:text-base text-[#594045] mt-2 max-w-2xl leading-relaxed font-body">
            Moi University student discounts, safety tips for hiring campus fundis, and how our L0 to L2 verification levels protect your money.
          </p>
        </section>

        {/* ACTIVE STUDENT DEALS GRID */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-2xl text-[#001C3B] uppercase tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#795900]" />
              <span>Active Student Discounts</span>
            </h2>
            <span className="text-xs text-[#594045]">Show Student ID to claim</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dealBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-white border-[1.5px] border-[#001C3B] rounded-xl p-4 shadow-[2px_2px_0px_#001C3B] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-[#594045]">
                      {biz.zone.replace('-', ' ')}
                    </span>
                    <span className="text-[11px] font-bold text-[#0B6E70] bg-[#E7EEFF] px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#001C3B] mt-1">
                    {biz.name}
                  </h3>

                  <div className="mt-2 p-2.5 bg-[#FFF4DC] border border-[#001C3B] rounded-lg text-xs font-bold text-[#795900] flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-[#795900]" />
                    <span>{biz.studentDiscount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D5DCE4] flex items-center justify-between">
                  <span className="text-xs text-[#594045]">{biz.walkTime || 'Near campus'}</span>
                  <Link
                    href={`/b/${biz.slug}`}
                    className="bg-[#001C3B] text-white text-xs font-bold px-4 py-1.5 rounded-full press-action"
                  >
                    View Shop
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRUST & VERIFICATION LEVELS */}
        <section className="bg-white border-2 border-[#001C3B] shadow-[3px_3px_0px_#001C3B] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-display font-black text-2xl text-[#001C3B] uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#0B6E70]" />
              <span>How MoiMashinani Protects Students</span>
            </h2>
            <p className="text-xs md:text-sm text-[#594045] mt-1 font-body">
              Every merchant on this directory is verified through a 3-tier safety standard:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-body">
            <div className="p-4 bg-[#F0F3FF] rounded-xl border border-[#001C3B] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#594045]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8D6F75]"></span>
                Level 0: Listed
              </div>
              <h3 className="font-display font-bold text-lg text-[#001C3B]">
                Basic Community Entry
              </h3>
              <p className="text-xs text-[#594045] leading-relaxed">
                Initial entry. Unconfirmed phone or address. Students should exercise standard caution before making large advance payments.
              </p>
            </div>

            <div className="p-4 bg-[#F0F3FF] rounded-xl border border-[#001C3B] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#0B6E70]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B6E70]"></span>
                Level 1: Phone Confirmed
              </div>
              <h3 className="font-display font-bold text-lg text-[#001C3B]">
                Owner OTP Verified
              </h3>
              <p className="text-xs text-[#594045] leading-relaxed">
                The owner verified their Kenyan Safaricom line via SMS OTP code. The owner has answered student calls directly.
              </p>
            </div>

            <div className="p-4 bg-[#EBF7F7] border-2 border-[#0B6E70] rounded-xl shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#0B6E70]">
                <CheckCircle2 className="w-4 h-4 text-[#0B6E70]" />
                Level 2: Team Verified
              </div>
              <h3 className="font-display font-bold text-lg text-[#001C3B]">
                Physical Shopfront Checked
              </h3>
              <p className="text-xs text-[#001C3B] leading-relaxed">
                Physically scouted by student ambassadors. Real photos of tools/shelves, verified landmark, and confirmed prices.
              </p>
            </div>
          </div>
        </section>

        {/* 5 GOLDEN RULES FOR CAMPUS TRADE */}
        <section className="bg-[#E7EEFF] border-2 border-[#001C3B] rounded-2xl p-6 md:p-8 space-y-4">
          <h2 className="font-display font-black text-2xl text-[#001C3B] uppercase">
            5 Golden Rules for Hiring Campus Services
          </h2>

          <div className="space-y-3 text-sm text-[#001C3B] font-body">
            <div className="p-3 bg-white border border-[#001C3B] rounded-lg">
              <strong>1. Inspect before full payment:</strong> Always test replaced screens, laptop keyboards, or tailored clothes before leaving the kiosk.
            </div>
            <div className="p-3 bg-white border border-[#001C3B] rounded-lg">
              <strong>2. Pay via M-Pesa Buy Goods / Till:</strong> Official till numbers provide clear transactional audit trails.
            </div>
            <div className="p-3 bg-white border border-[#001C3B] rounded-lg">
              <strong>3. Never send deposit to unverified phone numbers:</strong> For hostels or room deposits, visit in person first.
            </div>
            <div className="p-3 bg-white border border-[#001C3B] rounded-lg">
              <strong>4. Report ghost or inactive numbers:</strong> Click the three dots on any profile to report outdated contacts.
            </div>
            <div className="p-3 bg-white border border-[#001C3B] rounded-lg">
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
