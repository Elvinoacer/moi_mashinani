'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessCard } from '@/components/BusinessCard';
import { DemandModal } from '@/components/DemandModal';
import { CampusRadarDiscovery } from '@/components/CampusRadarDiscovery';
import { CATEGORIES } from '@/lib/constants';
import { Business } from '@/lib/types';
import { useNow } from '@/lib/useNow';
import {
  Search,
  ArrowRight,
  CategoryIcon,
  Star,
  Percent,
  ChevronRight,
  HelpCircle,
  Smartphone,
  Printer,
  Scissors,
  Flame,
  Shirt,
  Building2,
  UtensilsCrossed,
  Tag,
  WhatsAppIcon,
} from '@/components/icons';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandModalOpen, setDemandModalOpen] = useState(false);

  // Inline demand capture
  const [demandService, setDemandService] = useState('');
  const [demandPhone, setDemandPhone] = useState('');
  const [demandSent, setDemandSent] = useState(false);
  const [demandSubmitting, setDemandSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/businesses')
      .then((res) => res.json())
      .then((data) => {
        setBusinesses(data.results || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load businesses:', err);
        setLoading(false);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleInlineDemandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandService.trim() || !demandPhone.trim()) return;
    setDemandSubmitting(true);
    try {
      await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: demandService.trim(),
          phone: demandPhone.trim(),
          zone: 'kesses-centre',
        }),
      });
      setDemandSent(true);
      setDemandService('');
      setDemandPhone('');
    } catch (err) {
      console.error('Failed to submit demand:', err);
    } finally {
      setDemandSubmitting(false);
    }
  };

  const quickShortcuts = [
    { label: 'Phone & Laptop Repair', query: 'screen', icon: Smartphone },
    { label: 'Printing & Cyber', query: 'printing', icon: Printer },
    { label: 'Braids & Salon', query: 'braids', icon: Scissors },
    { label: 'Food & Cafes', query: 'food', icon: UtensilsCrossed },
    { label: 'Gas Refill Delivery', query: 'gas', icon: Flame },
    { label: 'Mama Fua (Laundry)', query: 'mama fua', icon: Shirt },
    { label: 'Hostel Vacancies', query: 'hostel', icon: Building2 },
    { label: 'Student Deals', href: '/deals', icon: Tag },
  ];

  const now = useNow();
  const campusAnchorCoords = { lat: 0.2831, lng: 35.2905 }; // Moi Main Gate default
  const availableNowListings = businesses.filter(
    (b) => b.availableNowUntil && new Date(b.availableNowUntil).getTime() > now
  );
  const featuredListings = businesses.filter(
    (b) => b.activeTier === 'FEATURED'
  );
  const dealsListings = businesses.filter((b) => Boolean(b.studentDiscount));

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F8] text-[#001C3B]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 pb-20 md:pb-12">
        {/* HERO / SEARCH BAR SIGNBOARD SECTION */}
        <section className="bg-white border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] rounded-2xl p-6 sm:p-8 md:p-10 relative overflow-hidden">
          {/* Subtle Corner Badge */}
          <div className="absolute top-0 right-0 bg-[#FFC53D] text-[#001C3B] font-display font-black text-[10px] sm:text-xs uppercase px-3 py-1 border-b border-l border-[#001C3B] shadow-sm transform rotate-0">
            KESSES DIRECTORY
          </div>

          <div className="max-w-4xl space-y-4">
            {/* Campus Pill */}
            <div className="inline-flex items-center gap-2 bg-[#E7EEFF] text-[#0B6E70] text-xs font-display font-bold px-3 py-1 rounded-full border border-[#001C3B]">
              <span className="w-2 h-2 rounded-full bg-[#0B6E70]"></span>
              <span>MOI UNIVERSITY MAIN CAMPUS HYPER-LOCAL HUB</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl text-[#001C3B] uppercase tracking-tight leading-[1.08]">
              FIND LOCAL FUNDIS, SALONS & CYBER SERVICES AROUND CAMPUS IN SECONDS.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#594045] max-w-2xl leading-relaxed">
              From Stage to Cheboiywo Gate, connect with verified student fundis and kiosk operators within walking distance. <strong className="text-[#001C3B]">Two taps to Call or WhatsApp.</strong>
            </p>

            {/* Primary Search Box */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="relative flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-[#594045] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Try: laptop repair, braids, cyber printing, gas refill..."
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F0F3FF] border-2 border-[#001C3B] rounded-xl text-sm sm:text-base text-[#001C3B] placeholder:text-[#594045] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#9B0044] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#001C3B] hover:bg-[#0B2545] text-white font-display font-black text-sm sm:text-base uppercase px-7 py-3.5 rounded-xl border-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex items-center justify-center gap-2"
                >
                  <span>Tafuta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Intent Shortcut Chips */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-[#594045] uppercase tracking-wider mb-2">
                Quick Shortcuts:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickShortcuts.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        if (chip.href) {
                          router.push(chip.href);
                        } else if (chip.query) {
                          router.push(`/search?q=${encodeURIComponent(chip.query)}`);
                        }
                      }}
                      className="bg-[#F0F3FF] hover:bg-[#DEE8FF] border-[1.5px] border-[#001C3B] text-[#001C3B] text-xs font-semibold px-3 py-1.5 rounded-lg press-action flex items-center gap-1.5 shadow-[1px_1px_0px_#001C3B]"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#0B6E70]" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CAMPUS LOCATION & ZONE RADAR DISCOVERY */}
        <CampusRadarDiscovery businesses={businesses} loading={loading} />

        {/* AVAILABLE RIGHT NOW SECTION (Live Pulse) */}
        {availableNowListings.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#25D366] animate-pulse"></span>
                <h2 className="font-display font-black text-lg sm:text-2xl text-[#001C3B] uppercase tracking-tight">
                  Available Right Now in Kesses
                </h2>
                <span className="text-[10px] sm:text-xs bg-[#25D366]/20 text-[#005658] border border-[#25D366]/40 font-bold px-2 py-0.5 rounded-full uppercase">
                  LIVE
                </span>
              </div>
              <Link
                href="/search?availableNow=true"
                className="text-xs sm:text-sm font-bold text-[#9B0044] hover:underline flex items-center gap-0.5"
              >
                <span>See all</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-[#594045] -mt-1">
              Open right now — walk in or get quick delivery directly to campus hostels.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {availableNowListings.slice(0, 4).map((biz) => (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  anchorCoordinates={campusAnchorCoords}
                  showDirectionsButton={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* FEATURED VERIFIED FUNDIS & SHOPS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-l-4 border-l-[#FFC53D] pl-3">
            <div>
              <h2 className="font-display font-black text-lg sm:text-2xl text-[#001C3B] uppercase tracking-tight flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FFC53D] fill-[#FFC53D]" />
                Featured Verified Fundis & Local Shops
              </h2>
              <p className="text-xs text-[#594045]">
                Top-rated campus providers with trusted track records and physical presence in Kesses.
              </p>
            </div>
            <Link
              href="/search"
              className="text-xs sm:text-sm font-bold text-[#9B0044] hover:underline flex items-center gap-0.5 flex-shrink-0"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-white rounded-xl border border-[#001C3B] animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featuredListings.length > 0 ? featuredListings : businesses.slice(0, 6)).map((biz) => (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  effectiveTier="FEATURED"
                  anchorCoordinates={campusAnchorCoords}
                  showDirectionsButton={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* BROWSE KESSES SERVICES BY CATEGORY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-black text-lg sm:text-2xl text-[#001C3B] uppercase tracking-tight">
                Browse Kesses Services by Category
              </h2>
              <p className="text-xs text-[#594045]">
                Click any category to filter verified local fundis and student service operators.
              </p>
            </div>
            <span className="text-[11px] font-display font-bold bg-[#E7EEFF] text-[#001C3B] px-2 py-0.5 rounded border border-[#001C3B]">
              12 CATEGORIES
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => {
              const count = businesses.filter(
                (b) => b.primaryCategory === cat.slug || b.extraCategories.includes(cat.slug)
              ).length;

              return (
                <Link
                  key={cat.id}
                  href={`/c/${cat.slug}`}
                  className="bg-white hover:bg-[#F0F3FF] p-3.5 rounded-xl border-[1.5px] border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex flex-col justify-between group transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center border border-[#001C3B] mb-2.5 transition-colors"
                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                  >
                    <CategoryIcon slug={cat.slug} className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-xs sm:text-sm text-[#001C3B] group-hover:text-[#9B0044] leading-tight">
                      {cat.name}
                    </h3>
                    <div className="text-[10px] text-[#594045] mt-1 flex items-center justify-between">
                      <span>{count} listings</span>
                      <ChevronRight className="w-3 h-3 text-[#594045] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* STUDENT DEALS CALLOUT SECTION */}
        {dealsListings.length > 0 && (
          <section className="bg-[#FFF8E1] border-2 border-[#001C3B] shadow-[3px_3px_0px_#001C3B] rounded-2xl p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[#795900] text-xs font-bold uppercase tracking-wider bg-[#FFDEA0] px-2.5 py-0.5 rounded border border-[#001C3B] mb-1">
                  <Percent className="w-3.5 h-3.5" />
                  <span>Moi University Student Perks</span>
                </div>
                <h2 className="font-display font-black text-xl sm:text-2xl text-[#261900] uppercase">
                  Moi Student Special Deals & Discounts
                </h2>
                <p className="text-xs text-[#6F5100]">
                  Show your student ID card to unlock these verified campus discounts.
                </p>
              </div>
              <Link
                href="/deals"
                className="bg-[#795900] hover:bg-[#5C4300] text-white font-display font-bold text-xs uppercase px-4 py-2 rounded-full border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center gap-1 flex-shrink-0"
              >
                <span>View All Deals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dealsListings.slice(0, 3).map((biz) => (
                <div
                  key={biz.id}
                  className="bg-white p-3.5 rounded-xl border border-[#001C3B] shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase bg-[#FFEAEF] text-[#9B0044] px-1.5 py-0.5 rounded border border-[#9B0044]/30">
                      DISCOUNT
                    </span>
                    <div className="font-display font-bold text-sm text-[#001C3B] truncate mt-1">
                      {biz.name}
                    </div>
                    <div className="text-xs font-bold text-[#795900]">
                      {biz.studentDiscount}
                    </div>
                  </div>
                  <Link
                    href={`/b/${biz.slug}`}
                    className="shrink-0 bg-[#001C3B] text-white text-xs font-bold px-3 py-1.5 rounded-full border border-[#001C3B] press-action"
                  >
                    Claim
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CAN'T FIND IT? INLINE DEMAND DESK */}
        <section className="bg-[#E7EEFF] border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-white px-2.5 py-1 rounded-full border border-[#001C3B] text-[#9B0044]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>STUDENT COMMUNITY REQUEST DESK</span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-[#001C3B] uppercase leading-tight">
                Can&apos;t find what you need around Kesses?
              </h2>
              <p className="text-xs sm:text-sm text-[#594045]">
                Tell us which specific fundi, spare part, or service you are struggling to locate. Our campus field ambassadors will scout the local kiosks and notify you via SMS within 2 hours.
              </p>
            </div>

            <div className="lg:col-span-5 bg-white p-5 rounded-xl border-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B]">
              {demandSent ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 bg-[#E7F6F6] text-[#0B6E70] rounded-full mx-auto flex items-center justify-center border border-[#0B6E70]">
                    ✓
                  </div>
                  <div className="font-display font-bold text-base text-[#001C3B]">Request Received!</div>
                  <p className="text-xs text-[#594045]">
                    Ambassadors are checking Stage and Kesses Centre shops now.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDemandSent(false)}
                    className="text-xs text-[#9B0044] font-bold underline"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInlineDemandSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#001C3B] uppercase mb-1">
                      What service or item are you looking for?
                    </label>
                    <input
                      type="text"
                      required
                      value={demandService}
                      onChange={(e) => setDemandService(e.target.value)}
                      placeholder="e.g. Type-C MacBook charger, sofa repair fundi..."
                      className="w-full bg-[#F0F3FF] border border-[#001C3B] rounded-lg px-3 py-2 text-xs text-[#001C3B] focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#001C3B] uppercase mb-1">
                      Your WhatsApp / Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={demandPhone}
                      onChange={(e) => setDemandPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full bg-[#F0F3FF] border border-[#001C3B] rounded-lg px-3 py-2 text-xs text-[#001C3B] focus:outline-none focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={demandSubmitting}
                    className="w-full bg-[#9B0044] hover:bg-[#C2185B] text-white font-display font-bold text-xs uppercase py-2.5 rounded-lg border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1.5"
                  >
                    <span>{demandSubmitting ? 'Sending Request...' : 'Request Service from Campus Ambassadors'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM MERCHANT RECRUITMENT CALLOUT */}
        <section className="bg-white border-2 border-[#001C3B] shadow-[3px_3px_0px_#001C3B] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-[11px] font-extrabold uppercase bg-[#FFDEA0] text-[#795900] px-2 py-0.5 rounded border border-[#001C3B]">
              100% FREE FOR LOCAL TRADERS
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-[#001C3B] uppercase">
              Are you a fundi, salonist, or kiosk owner in Kesses?
            </h3>
            <p className="text-xs text-[#594045] max-w-xl">
              Get your shop seen by over 12,000+ Moi University students walking past your door every day. We verify your location and add direct Two-Tap WhatsApp & Call buttons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://wa.me/254700000000?text=Habari%20MoiMashinani%2C%20nataka%20kuweka%20biashara%20yangu%20kwa%20directory"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba5a] text-[#001C3B] text-xs font-display font-bold px-4 py-2.5 rounded-full border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center gap-1.5"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Register on WhatsApp</span>
            </a>

            <Link
              href="/onboard"
              className="bg-[#001C3B] hover:bg-[#0B2545] text-white text-xs font-display font-bold px-4 py-2.5 rounded-full border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action"
            >
              Fill Web Form
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />

      {demandModalOpen && (
        <DemandModal
          initialQuery={searchQuery}
          onClose={() => setDemandModalOpen(false)}
        />
      )}
    </div>
  );
}
