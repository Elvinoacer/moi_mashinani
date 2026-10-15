"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FlashDeals } from "@/components/FlashDeals";
import { ZONES } from "@/lib/constants";
import { useCampusZone } from "@/lib/useCampusZone";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { Business } from "@/lib/types";
import { BusinessCard } from "@/components/BusinessCard";
import { JoinNeighborhoodCard } from "@/components/JoinNeighborhoodCard";
import { CheckCircle2, Tag, ShieldCheck } from "@/components/icons";

interface DealsPageClientProps {
  initialDeals?: Business[];
  initialBudget?: Array<{
    id: string;
    name: string;
    price: number;
    businessName: string;
    slug: string;
    zone: string;
  }>;
}

export function DealsPageClient({
  initialDeals,
  initialBudget = [],
}: DealsPageClientProps) {
  const [dealBusinesses, setDealBusinesses] = useState<Business[]>(
    initialDeals ?? [],
  );
  const [dealLoading, setDealLoading] = useState(initialDeals === undefined);
  const [zone, setZone] = useCampusZone();
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDeals !== undefined) return;

    const controller = new AbortController();
    fetch("/api/businesses?discount=true", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Could not load student deals. Please reload.",
          );
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDealBusinesses(data.results || []);
          setDealLoading(false);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Connection error. Please reload.",
          );
          setDealLoading(false);
        }
      });
    return () => controller.abort();
  }, [initialDeals]);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20 md:pb-12">
        <label className="block font-bold">
          Your delivery zone
          <select
            aria-label="Your delivery zone"
            className="ui-input"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            {ZONES.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <FlashDeals />
        {dealBusinesses.length < 6 && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">
              Budget comrade picks under KES 300
            </h2>
            <p className="text-sm">
              Everyday listed prices. Confirm the current price and availability
              with the seller.
            </p>
            {initialBudget.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {initialBudget.map((item) => (
                  <Link
                    className="ui-card"
                    href={`/b/${item.slug}`}
                    key={item.id}
                  >
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="my-2 text-lg font-bold">
                      KES {item.price.toLocaleString("en-KE")}
                    </p>
                    <p className="text-sm">
                      {item.businessName} · {item.zone.replaceAll("-", " ")}
                    </p>
                    <span className="mt-3 inline-block text-sm underline">
                      View prices →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="ui-card">
                <p>Help us find your next budget pick.</p>
                <Link
                  className="ui-button ui-button-primary mt-3"
                  href="/requests"
                >
                  Post your budget request
                </Link>
              </div>
            )}
          </section>
        )}
        {/* Header Banner */}
        <section className="page-hero bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-6 md:p-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase mb-3"
          >
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#243b32]">Student Deals</span>
          </nav>

          <div className="inline-flex items-center gap-1.5 bg-[#e9eedf] text-[#526936] text-xs font-display font-bold px-3 py-1 rounded-full border border-[#dfe5d8] mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>DAILY COMRADE DEALS & DROPS</span>
          </div>
          <h1 className="font-display font-black text-3xl md:text-5xl text-[#243b32] uppercase tracking-tight">
            Today’s Campus Deals
          </h1>
          <p className="text-sm md:text-base text-[#667064] mt-2 max-w-2xl leading-relaxed font-body">
            Moi University student discounts, safety tips for hiring campus
            fundis, and what our listing and verification levels mean.
          </p>
        </section>

        {/* ACTIVE STUDENT DEALS GRID */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-[#526936]" />
              <span>Active Student Discounts</span>
            </h2>
            <span className="text-xs text-[#667064]">
              Show Student ID to claim
            </span>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-white p-5 text-sm text-[#a7302d]"
            >
              {error}
            </p>
          ) : dealLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[460px] animate-pulse rounded-[22px] border border-[#e1e7dc] bg-[#e9eedf]"
                />
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
              <h3 className="text-lg font-bold text-[#183e35]">
                Fresh student deals are on their way.
              </h3>
              <p className="mt-2 text-sm text-[#667064]">
                Explore nearby businesses while owners prepare their next
                offers.
              </p>
              <Link
                href="/search"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#183e35] px-5 text-sm font-semibold text-white"
              >
                Explore local businesses →
              </Link>
            </div>
          )}
        </section>

        <JoinNeighborhoodCard />

        {/* TRUST & VERIFICATION LEVELS */}
        <section className="bg-white border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-display font-black text-2xl text-[#243b32] uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#335e41]" />
              <span>Understand campus verification</span>
            </h2>
            <p className="text-xs md:text-sm text-[#667064] mt-1 font-body">
              Listings have different evidence levels. A badge describes checks,
              and does not guarantee a transaction:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-body">
            <div className="p-4 bg-[#e9eedf] rounded-xl border border-[#dfe5d8] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#667064]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#758071]" />
                Level 0: Listed
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Basic Community Entry
              </h3>
              <p className="text-xs text-[#667064] leading-relaxed">
                Initial entry. Unconfirmed phone or address. Students should
                exercise standard caution before making large advance payments.
              </p>
            </div>

            <div className="p-4 bg-[#e9eedf] rounded-xl border border-[#dfe5d8] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#335e41]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#335e41]" />
                Level 1: Recheck Needed
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Details Awaiting Field Check
              </h3>
              <p className="text-xs text-[#667064] leading-relaxed">
                Owner details are on file, or key details changed after a visit.
                Current identity and location still need a field check.
              </p>
            </div>

            <div className="p-4 bg-[#edf2e5] border-2 border-[#335e41] rounded-xl shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#335e41]">
                <CheckCircle2 className="w-4 h-4 text-[#335e41]" />
                Level 2: Team Verified
              </div>
              <h3 className="font-display font-bold text-lg text-[#243b32]">
                Shop or Comrade Seller Checked
              </h3>
              <p className="text-xs text-[#243b32] leading-relaxed">
                A field reviewer checked the shopfront or student seller
                identity and campus location. See the profile for the check date
                and open reports.
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
              <strong>1. Inspect before full payment:</strong> Always test
              replaced screens, laptop keyboards, or tailored clothes before
              leaving the kiosk.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>2. Pay via M-Pesa Buy Goods / Till:</strong> Official till
              numbers provide clear transactional audit trails.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>
                3. Never send deposit to unverified phone numbers:
              </strong>{" "}
              For hostels or room deposits, visit in person first.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>4. Report ghost or inactive numbers:</strong> Click the
              three dots on any profile to report outdated contacts.
            </div>
            <div className="p-3 bg-white border border-[#dfe5d8] rounded-lg">
              <strong>5. Agree on diagnosis costs upfront:</strong> Confirm
              whether opening a phone or laptop incurs a diagnostic fee.
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
