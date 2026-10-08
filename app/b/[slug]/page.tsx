'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingModal } from '@/components/BookingModal';
import { ReportModal } from '@/components/ReportModal';
import { ClaimModal } from '@/components/ClaimModal';
import { BusinessCard } from '@/components/BusinessCard';
import { Business } from '@/lib/types';
import { useNow } from '@/lib/useNow';
import {
  Store,
  Share2,
  AlertCircle,
  Star,
  CheckCircle2,
  MapPin,
  Clock,
  Phone,
  WhatsAppIcon,
  Calendar,
  Info,
  Tag,
  ThumbsUp,
  ExternalLink,
} from '@/components/icons';

export default function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const now = useNow();
  const [business, setBusiness] = useState<Business | null>(null);
  const [similarBusinesses, setSimilarBusinesses] = useState<Business[]>([]);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    fetch(`/api/businesses/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: Business) => {
        setBusiness(data);
        setLoading(false);

        // Record profile view
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/events',
            JSON.stringify({ businessId: data.id, type: 'view' })
          );
        }

        // Fetch similar businesses
        fetch(`/api/businesses?category=${data.primaryCategory}`)
          .then((r) => r.json())
          .then((catData) => {
            const others = (catData.results || []).filter((b: Business) => b.id !== data.id);
            setSimilarBusinesses(others.slice(0, 3));
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load business:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F2F5F8]">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-center">
          <div className="inline-block p-4 bg-white signboard-border rounded-xl animate-pulse">
            Loading business profile...
          </div>
        </main>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F2F5F8]">
        <Navbar />
        <main className="flex-1 max-w-md w-full mx-auto p-8 text-center space-y-4">
          <Store className="w-16 h-16 text-[#8D6F75] mx-auto" />
          <h1 className="font-display font-bold text-2xl text-[#001C3B]">
            Business Not Found
          </h1>
          <p className="text-sm text-[#594045]">
            This shop may have changed its address or been removed.
          </p>
          <Link
            href="/search"
            className="inline-block bg-[#001C3B] text-white px-5 py-2 rounded-full font-bold text-xs uppercase"
          >
            Browse All Shops
          </Link>
        </main>
      </div>
    );
  }

  const isFeatured = business.activeTier === 'FEATURED';
  const isRecommended = business.activeTier === 'RECOMMENDED';
  const isAvailableNow = Boolean(
    business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now
  );

  const handleCall = () => {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', JSON.stringify({ businessId: business.id, type: 'call' }));
    }
  };

  const handleWhatsApp = () => {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/events',
        JSON.stringify({ businessId: business.id, type: 'whatsapp' })
      );
    }
  };

  const handleDirections = () => {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/events',
        JSON.stringify({ businessId: business.id, type: 'directions' })
      );
    }
    const mapsUrl = business.mapPin
      ? `https://www.google.com/maps/dir/?api=1&destination=${business.mapPin.lat},${business.mapPin.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${business.name} ${business.landmark} Moi University Kesses`
        )}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${business.name} | Moi University Directory`,
          text: `Check out ${business.name} around campus on MoiMashinani:`,
          url,
        });
        return;
      } catch {
        // Fallback
      }
    }
    navigator.clipboard.writeText(url);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const cleanPhone = business.whatsapp.replace(/\D/g, '');
  const prefilledText = encodeURIComponent(
    `Hi ${business.name}, I found you on MoiMashinani. I need help with ${business.services[0]?.name || 'your services'}. Are you available today?`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${prefilledText}`;

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayHours = business.hours[currentDayName];

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F8] pb-24 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Breadcrumb & Share Header */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#594045]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-[#9B0044]">Home</Link>
            <span>/</span>
            <Link href={`/c/${business.primaryCategory}`} className="hover:text-[#9B0044] capitalize">
              {business.primaryCategory.replace(/-/g, ' ')}
            </Link>
            <span>/</span>
            <span className="text-[#001C3B] font-bold truncate max-w-[150px]">{business.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="bg-white hover:bg-[#F0F3FF] signboard-border px-2.5 py-1 rounded-full text-xs font-bold text-[#001C3B] flex items-center gap-1 press-action"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="text-[#8D6F75] hover:text-[#BA1A1A] p-1"
              title="Report issue"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GALLERY SECTION */}
        <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl overflow-hidden">
          <div className="relative h-64 sm:h-80 md:h-96 w-full bg-[#E7EEFF]">
            {business.photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.photos[activePhotoIdx] || business.coverPhoto}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#594045]">
                No photos available
              </div>
            )}

            {/* Photo Counter Badge */}
            {business.photos.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-[#001C3B]/80 text-white font-display text-xs font-bold px-2.5 py-1 rounded-full signboard-border backdrop-blur-xs">
                {activePhotoIdx + 1} / {business.photos.length}
              </div>
            )}
          </div>

          {/* Photo Thumbnails Strip */}
          {business.photos.length > 1 && (
            <div className="p-3 bg-[#F9F9FF] border-t border-[#001C3B] flex gap-2 overflow-x-auto">
              {business.photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePhotoIdx(i)}
                  className={`w-16 h-16 rounded overflow-hidden signboard-border shrink-0 press-action ${
                    activePhotoIdx === i ? 'ring-2 ring-[#9B0044]' : 'opacity-70'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TITLE BLOCK & BADGES */}
        <div className="bg-white signboard-border-thick signboard-shadow rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isFeatured && (
              <span className="bg-[#FFC53D] text-[#001C3B] font-display font-black text-xs px-2.5 py-1 rounded signboard-border signboard-shadow-sm flex items-center gap-1 uppercase tracking-tight">
                <Star className="w-3.5 h-3.5 fill-[#001C3B]" />
                FEATURED
              </span>
            )}

            {isRecommended && !isFeatured && (
              <span className="bg-[#0B6E70] text-white font-display font-black text-xs px-2.5 py-1 rounded signboard-border signboard-shadow-sm flex items-center gap-1 uppercase tracking-tight">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RECOMMENDED
              </span>
            )}

            {business.verificationLevel === 'L2' && (
              <span className="bg-white text-[#001C3B] font-display font-bold text-xs px-2 py-0.5 rounded signboard-border flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6E70]" />
                Verified by Team
              </span>
            )}

            {isAvailableNow && (
              <span className="bg-[#E7EEFF] text-[#005658] font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                Available Right Now
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-[#001C3B] uppercase tracking-tight">
              {business.name}
            </h1>
            <p className="text-sm md:text-base text-[#594045] mt-1 font-body">
              {business.tagline}
            </p>
          </div>

          {/* Location & Status meta */}
          <div className="pt-2 border-t border-[#D5DCE4] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-[#001C3B]">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[#C2185B] flex-shrink-0" />
              <span className="font-semibold">{business.landmark}</span>
              {business.walkTime && (
                <span className="text-[#594045]">({business.walkTime})</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-[#0B6E70] flex-shrink-0" />
              {todayHours && !todayHours.closed ? (
                <span>
                  <strong className="text-[#0B6E70]">Open today:</strong> {todayHours.open} - {todayHours.close}
                </span>
              ) : (
                <span className="text-[#BA1A1A] font-bold">Closed today</span>
              )}
            </div>
          </div>

          {/* Unclaimed Notice if applicable */}
          {!business.isClaimed && (
            <div className="p-3 bg-[#FFF4DC] signboard-border rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#795900]">
                <Store className="w-4 h-4 flex-shrink-0" />
                <span>Is this your shop? Claim it with your ambassador code to manage it.</span>
              </div>
              <button
                type="button"
                onClick={() => setClaimModalOpen(true)}
                className="bg-[#001C3B] text-white px-3 py-1 rounded-full font-bold uppercase text-[10px]"
              >
                Claim Shop
              </button>
            </div>
          )}

          {/* PRIMARY ACTION BUTTONS (Desktop and top row) */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={`tel:${business.phone}`}
              onClick={handleCall}
              className="bg-[#C2185B] hover:bg-[#9E1049] text-white font-display font-bold text-sm uppercase py-3 px-4 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call ({business.phone})</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsApp}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-[#001C3B] font-display font-bold text-sm uppercase py-3 px-4 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>WhatsApp Message</span>
            </a>
            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              className="bg-white hover:bg-[#F0F3FF] text-[#001C3B] font-display font-bold text-sm uppercase py-3 px-4 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-[#9B0044]" />
              <span>Request Booking</span>
            </button>
          </div>
        </div>

        {/* ABOUT SECTION */}
        <section className="bg-white signboard-border rounded-xl p-5 md:p-6 space-y-3 signboard-shadow">
          <h2 className="font-display font-bold text-xl text-[#001C3B] uppercase tracking-tight flex items-center gap-1.5">
            <Info className="w-5 h-5 text-[#9B0044]" />
            About {business.name}
          </h2>
          <p className="text-sm md:text-base text-[#001C3B] leading-relaxed whitespace-pre-line font-body">
            {business.description}
          </p>

          {/* Service modes chips */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#594045] uppercase">Mode:</span>
            {business.serviceModes.map((mode) => (
              <span
                key={mode}
                className="bg-[#F0F3FF] text-[#001C3B] text-xs font-semibold px-2.5 py-1 rounded-full signboard-border"
              >
                {mode === 'at_shop'
                  ? 'At Shop'
                  : mode === 'comes_to_you'
                  ? 'Comes to Your Hostel'
                  : mode === 'delivery'
                  ? 'Hostel Delivery'
                  : 'Online'}
              </span>
            ))}
          </div>
        </section>

        {/* SERVICES AND PRICES TABLE */}
        <section className="bg-white signboard-border rounded-xl p-5 md:p-6 space-y-4 signboard-shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#001C3B] uppercase tracking-tight flex items-center gap-1.5">
              <Tag className="w-5 h-5 text-[#9B0044]" />
              Services & Price List
            </h2>
            <span className="text-xs text-[#594045]">Prices in KES</span>
          </div>

          <div className="divide-y divide-[#D5DCE4]">
            {business.services.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-[#001C3B]">{item.name}</div>
                  {item.note && <div className="text-xs text-[#594045] mt-0.5">{item.note}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-base text-[#001C3B]">
                    {item.priceFrom ? `KSh ${item.priceFrom.toLocaleString()}` : 'Contact for price'}
                    {item.unit ? ` / ${item.unit}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Student discount banner */}
          {business.studentDiscount && (
            <div className="bg-[#FFF4DC] signboard-border p-3 rounded-lg flex items-center gap-3">
              <Tag className="w-6 h-6 text-[#795900] flex-shrink-0" />
              <div>
                <div className="font-bold text-xs uppercase text-[#795900]">Student Discount Available</div>
                <div className="text-sm font-semibold text-[#261900]">{business.studentDiscount}</div>
              </div>
            </div>
          )}
        </section>

        {/* OPENING HOURS */}
        <section className="bg-white signboard-border rounded-xl p-5 md:p-6 space-y-3 signboard-shadow">
          <h2 className="font-display font-bold text-xl text-[#001C3B] uppercase tracking-tight flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-[#9B0044]" />
            Opening Hours
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
            {Object.entries(business.hours).map(([day, hrs]) => {
              const isToday = day === currentDayName;
              return (
                <div
                  key={day}
                  className={`p-2 rounded flex justify-between items-center ${
                    isToday ? 'bg-[#FFDEA0] font-bold text-[#261900] signboard-border' : 'text-[#594045]'
                  }`}
                >
                  <span className="capitalize">{day}</span>
                  <span>{hrs.closed ? 'Closed' : `${hrs.open} - ${hrs.close}`}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* LOCATION & LANDMARK MAP */}
        <section className="bg-white signboard-border rounded-xl p-5 md:p-6 space-y-4 signboard-shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#001C3B] uppercase tracking-tight flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-[#9B0044]" />
              Location & Campus Directions
            </h2>
            <button
              onClick={handleDirections}
              className="bg-[#001C3B] text-white text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 press-action"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Google Maps</span>
            </button>
          </div>

          <div className="p-3.5 bg-[#F0F3FF] rounded-lg signboard-border space-y-1.5 text-sm text-[#001C3B]">
            <div>
              <strong>Landmark:</strong> {business.landmark}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#594045] pt-1 border-t border-[#001C3B]/10">
              {business.walkTime && (
                <span>
                  <strong>Walk time:</strong> {business.walkTime} from campus
                </span>
              )}
              {business.mapPin && (
                <span className="font-mono">
                  <strong>GPS:</strong> {business.mapPin.lat.toFixed(4)}° N, {business.mapPin.lng.toFixed(4)}° E
                </span>
              )}
              <span className="text-[#0B6E70] font-semibold">
                ✓ Physically verified on campus
              </span>
            </div>
          </div>

          {/* Interactive Map Visual */}
          <div
            onClick={handleDirections}
            className="h-48 md:h-64 bg-[#E7EEFF] signboard-border rounded-lg relative overflow-hidden flex items-center justify-center cursor-pointer group"
          >
            {/* Styled Map Background Representation */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#001C3B_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="z-10 bg-white signboard-border p-3.5 rounded-lg signboard-shadow text-center space-y-1">
              <MapPin className="w-8 h-8 text-[#C2185B] mx-auto" />
              <div className="font-bold text-sm text-[#001C3B]">{business.name}</div>
              <div className="text-xs text-[#594045]">{business.landmark}</div>
              <div className="text-[11px] text-[#9B0044] font-bold pt-1">
                Tap to navigate with Google Maps
              </div>
            </div>
          </div>
        </section>

        {/* SIMILAR NEARBY BUSINESSES */}
        {similarBusinesses.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="font-display font-bold text-xl text-[#001C3B] uppercase tracking-tight flex items-center gap-1.5">
              <ThumbsUp className="w-5 h-5 text-[#9B0044]" />
              Similar Nearby Shops
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarBusinesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* STICKY BOTTOM CONTACT BAR (MOBILE THUMB-REACH) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#001C3B] p-2.5 z-40 shadow-lg grid grid-cols-2 gap-2">
        <a
          href={`tel:${business.phone}`}
          onClick={handleCall}
          className="w-full bg-[#C2185B] text-white font-display font-bold text-sm uppercase py-2.5 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-1.5"
        >
          <Phone className="w-4 h-4" />
          <span>Call Now</span>
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsApp}
          className="w-full bg-[#25D366] text-[#001C3B] font-display font-bold text-sm uppercase py-2.5 rounded-full signboard-border signboard-shadow press-action flex items-center justify-center gap-1.5"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>
      </div>

      <Footer />

      {/* MODALS */}
      {bookingModalOpen && (
        <BookingModal
          business={business}
          onClose={() => setBookingModalOpen(false)}
        />
      )}

      {reportModalOpen && (
        <ReportModal
          business={business}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {claimModalOpen && (
        <ClaimModal
          businessSlug={business.slug}
          businessName={business.name}
          onClose={() => setClaimModalOpen(false)}
        />
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#001C3B] text-white text-xs font-bold px-4 py-2 rounded-full signboard-border signboard-shadow-lg z-50">
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}
