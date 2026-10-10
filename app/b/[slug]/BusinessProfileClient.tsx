'use client';

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BookingModal } from '@/components/BookingModal';
import { ReportModal } from '@/components/ReportModal';
import { ClaimModal } from '@/components/ClaimModal';
import { BusinessCard } from '@/components/BusinessCard';
import { Business } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';
import { useNow } from '@/lib/useNow';
import { trackBusinessEvent } from '@/lib/track-business-event';
import {
  Store,
  Share2,
  Star,
  CheckCircle2,
  MapPin,
  Clock,
  Phone,
  WhatsAppIcon,
  Tag,
  ExternalLink,
} from '@/components/icons';

interface BusinessProfileClientProps {
  slug: string;
  initialBusiness?: Business | null;
  initialSimilar?: Business[];
}

export function BusinessProfileClient({
  slug,
  initialBusiness,
  initialSimilar = [],
}: BusinessProfileClientProps) {
  const now = useNow();
  const [business, setBusiness] = useState<Business | null>(initialBusiness ?? null);
  const [similarBusinesses, setSimilarBusinesses] = useState<Business[]>(initialSimilar);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [loading, setLoading] = useState(initialBusiness === undefined);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string>();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialBusiness && initialBusiness.status === 'ACTIVE') {
      trackBusinessEvent(initialBusiness.id, 'view');
    }
  }, [initialBusiness]);

  useEffect(() => {
    // Only fetch if initialBusiness was not provided
    if (initialBusiness !== undefined) return;

    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/businesses/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'This business is not available.'
              : data.error || 'Could not load the business. Please try again.'
          );
        }
        if (controller.signal.aborted) return;
        setBusiness(data);
        if (data.status === 'ACTIVE') trackBusinessEvent(data.id, 'view');

        const similar = await fetch(
          `/api/businesses?category=${encodeURIComponent(data.primaryCategory)}`,
          { signal: controller.signal }
        );
        if (similar.ok) {
          const related = await similar.json();
          if (!controller.signal.aborted) {
            setSimilarBusinesses(
              (related.results || []).filter((item: Business) => item.id !== data.id).slice(0, 3)
            );
          }
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Connection error. Please reload.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, initialBusiness]);

  if (loading) {
    return (
      <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
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
      <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
        <Navbar />
        <main className="flex-1 max-w-md w-full mx-auto p-8 text-center space-y-4">
          <Store className="w-16 h-16 text-[#758071] mx-auto" />
          <h1 className="font-display font-bold text-2xl text-[#243b32]">
            Business Not Found
          </h1>
          <p className="text-sm text-[#667064]">
            {error || 'This shop may have changed its address or been removed.'}
          </p>
          <Link
            href="/search"
            className="inline-block bg-[#243b32] text-white px-5 py-2 rounded-full font-bold text-xs uppercase"
          >
            Browse All Shops
          </Link>
        </main>
      </div>
    );
  }

  const galleryPhotos = Array.from(new Set([business.coverPhoto, ...business.photos].filter(Boolean)));
  const promotionActive = Boolean(business.tierEndsAt && new Date(business.tierEndsAt).getTime() > now);
  const isFeatured = business.activeTier === 'FEATURED' && promotionActive;
  const isRecommended = business.activeTier === 'RECOMMENDED' && promotionActive;
  const isAvailableNow = Boolean(
    !business.isTemporarilyClosed && business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now
  );

  const handleCall = () => trackBusinessEvent(business.id, 'call');
  const handleWhatsApp = () => trackBusinessEvent(business.id, 'whatsapp');

  const handleDirections = () => {
    trackBusinessEvent(business.id, 'directions');
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
    await navigator.clipboard.writeText(url);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  const recipient = (business.whatsapp || business.phone || '').replace(/\D/g, '');
  const whatsappPhone = recipient.startsWith('0') ? '254' + recipient.slice(1) : recipient;
  const whatsappMessage = encodeURIComponent(
    `Habari ${business.name}, nimeona profile yako kwa MoiMashinani campus directory. Naomba kuuliza kuhusu huduma zenu.`
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 md:pb-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href={`/c/${business.primaryCategory}`} className="hover:underline">
            {CATEGORIES.find((c) => c.slug === business.primaryCategory)?.name || business.primaryCategory.replace(/-/g, ' ')}
          </Link>
          <span>/</span>
          <span className="text-[#243b32] truncate max-w-[200px]">{business.name}</span>
        </nav>

        {/* PHOTO GALLERY */}
        <div className="bg-white signboard-border-thick signboard-shadow rounded-2xl overflow-hidden">
          <div className="relative aspect-[16/9] w-full bg-[#183e35]/5 flex items-center justify-center overflow-hidden">
            {galleryPhotos.length > 0 ? (
              <Image
                unoptimized
                width={1200}
                height={800}
                src={galleryPhotos[activePhotoIdx] || galleryPhotos[0]}
                alt={`${business.name} storefront in ${business.zone}, Moi University Kesses`}
                priority
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#667064]">
                No photos available
              </div>
            )}

            {/* Photo Counter Badge */}
            {galleryPhotos.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-[#243b32]/80 text-white font-display text-xs font-bold px-2.5 py-1 rounded-full signboard-border backdrop-blur-xs">
                {activePhotoIdx + 1} / {galleryPhotos.length}
              </div>
            )}
          </div>

          {/* Photo Thumbnails Strip */}
          {galleryPhotos.length > 1 && (
            <div className="p-3 bg-[#ffffff] border-t border-[#dfe5d8] flex gap-2 overflow-x-auto">
              {galleryPhotos.map((photo, i) => (
                <button
                  key={i}
                  aria-label={`View photo ${i + 1}`}
                  type="button"
                  onClick={() => setActivePhotoIdx(i)}
                  className={`w-16 h-16 rounded overflow-hidden signboard-border shrink-0 press-action ${
                    activePhotoIdx === i ? 'ring-2 ring-[#183e35]' : 'opacity-70'
                  }`}
                >
                  <Image
                    unoptimized
                    width={1200}
                    height={800}
                    src={photo}
                    alt={`${business.name} photo ${i + 1} in ${business.zone}, Moi University`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TITLE BLOCK & BADGES */}
        <div className="bg-white signboard-border-thick signboard-shadow rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isFeatured && (
              <span className="bg-[#d9f279] text-[#243b32] font-display font-black text-xs px-2.5 py-1 rounded signboard-border signboard-shadow-sm flex items-center gap-1 uppercase tracking-tight">
                <Star className="w-3.5 h-3.5 fill-[#243b32]" />
                FEATURED
              </span>
            )}

            {isRecommended && !isFeatured && (
              <span className="bg-[#335e41] text-white font-display font-black text-xs px-2.5 py-1 rounded signboard-border signboard-shadow-sm flex items-center gap-1 uppercase tracking-tight">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RECOMMENDED
              </span>
            )}

            {business.verificationLevel === 'L2' && (
              <span className="bg-white text-[#243b32] font-display font-bold text-xs px-2 py-0.5 rounded signboard-border flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#335e41]" />
                Verified by Team
              </span>
            )}

            {isAvailableNow && (
              <span className="bg-[#d9f279]/30 text-[#243b32] font-display font-bold text-xs px-2 py-0.5 rounded border border-[#d9f279] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#335e41]" />
                Open Right Now
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-black text-2xl md:text-3xl text-[#243b32] uppercase tracking-tight">
                {business.name}
              </h1>
              {business.tagline && (
                <p className="font-display font-bold text-sm md:text-base text-[#183e35] mt-0.5">
                  {business.tagline}
                </p>
              )}
            </div>

            <button
              onClick={handleShare}
              className="self-start sm:self-auto p-2.5 rounded-full border border-[#dfe5d8] hover:bg-[#e9eedf] transition text-[#243b32] flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>

          {/* Quick Location Badge */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-[#667064] pt-2 border-t border-[#dfe5d8]">
            <span className="flex items-center gap-1 text-[#243b32]">
              <MapPin className="w-4 h-4 text-[#183e35]" />
              <span className="uppercase">{business.zone.replace(/-/g, ' ')}</span>
            </span>
            {business.walkTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#183e35]" />
                <span>{business.walkTime} from Gate</span>
              </span>
            )}
            <span className="text-[#335e41]">{business.landmark}</span>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${business.phone}`}
            onClick={handleCall}
            className="flex items-center justify-center gap-2 bg-[#d9f279] text-[#243b32] font-display font-black text-sm md:text-base py-3.5 px-4 rounded-xl signboard-border signboard-shadow press-action uppercase tracking-tight"
          >
            <Phone className="w-5 h-5 fill-[#243b32]" />
            <span>Call Shop</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-display font-black text-sm md:text-base py-3.5 px-4 rounded-xl signboard-border signboard-shadow press-action uppercase tracking-tight"
          >
            <WhatsAppIcon className="w-5 h-5 fill-white" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* STUDENT DISCOUNT CALLOUT */}
        {business.studentDiscount && (
          <div className="bg-[#e9eedf] border border-[#dfe5d8] rounded-xl p-4 flex items-center gap-3">
            <Tag className="w-5 h-5 text-[#335e41] shrink-0" />
            <div>
              <span className="font-display font-black text-xs text-[#335e41] uppercase tracking-wider block">
                Moi Student Discount
              </span>
              <p className="text-xs md:text-sm font-bold text-[#243b32] mt-0.5 font-body">
                {business.studentDiscount}
              </p>
            </div>
          </div>
        )}

        {/* ABOUT & SERVICES SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white signboard-border signboard-shadow-sm rounded-xl p-5 space-y-3">
              <h2 className="font-display font-black text-base text-[#243b32] uppercase tracking-tight">
                About This Shop
              </h2>
              <p className="text-sm text-[#243b32] leading-relaxed font-body whitespace-pre-line">
                {business.description}
              </p>

              {/* Service Modes */}
              <div className="flex flex-wrap gap-2 pt-2">
                {business.serviceModes.includes('at_shop') && (
                  <span className="bg-[#e9eedf] text-[#243b32] text-xs font-bold px-2.5 py-1 rounded-full border border-[#dfe5d8]">
                    ✓ Visit Shop
                  </span>
                )}
                {business.serviceModes.includes('comes_to_you') && (
                  <span className="bg-[#e9eedf] text-[#243b32] text-xs font-bold px-2.5 py-1 rounded-full border border-[#dfe5d8]">
                    ✓ Hostel Delivery / Call-out
                  </span>
                )}
              </div>
            </div>

            {/* Services & Price Menu */}
            {business.services && business.services.length > 0 && (
              <div className="bg-white signboard-border signboard-shadow-sm rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-black text-base text-[#243b32] uppercase tracking-tight">
                    Services & Pricing
                  </h2>
                  <span className="text-xs text-[#667064]">Estimated rates</span>
                </div>

                <div className="divide-y divide-[#dfe5d8]">
                  {business.services.map((service, idx) => (
                    <div key={service.id || idx} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-display font-bold text-sm text-[#243b32] block">
                          {service.name}
                        </span>
                        {service.unit && (
                          <span className="text-xs text-[#667064]">{service.unit}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-display font-black text-sm text-[#183e35]">
                          {service.priceFrom !== undefined ? `KES ${service.priceFrom.toLocaleString()}` : 'Price on inquiry'}
                        </span>
                        <button
                          onClick={() => {
                            setBookingService(service.name);
                            setBookingModalOpen(true);
                          }}
                          className="bg-[#243b32] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#183e35] transition uppercase tracking-tight"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR: Hours & Location Details */}
          <div className="space-y-6">
            {/* Opening Hours */}
            <div className="bg-white signboard-border signboard-shadow-sm rounded-xl p-5 space-y-3">
              <h3 className="font-display font-black text-base text-[#243b32] uppercase tracking-tight flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#183e35]" />
                <span>Opening Hours</span>
              </h3>

              <div className="text-xs space-y-1.5 font-body">
                {business.hours && Object.keys(business.hours).length > 0 ? (
                  Object.entries(business.hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between py-1 border-b border-[#dfe5d8]/50 last:border-0">
                      <span className="font-bold text-[#243b32] capitalize">{day}</span>
                      <span className="text-[#667064]">
                        {hours.open && hours.close ? `${hours.open} – ${hours.close}` : 'Closed'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#667064]">Contact shop directly for exact daily hours.</p>
                )}
              </div>
            </div>

            {/* Directions & Map Pin */}
            <div className="bg-white signboard-border signboard-shadow-sm rounded-xl p-5 space-y-3">
              <h3 className="font-display font-black text-base text-[#243b32] uppercase tracking-tight flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#183e35]" />
                <span>Location</span>
              </h3>

              <p className="text-xs text-[#243b32] font-body leading-relaxed">
                {business.landmark}
              </p>

              <button
                onClick={handleDirections}
                className="w-full mt-2 bg-white text-[#243b32] border border-[#243b32] py-2.5 rounded-full font-display font-black text-xs uppercase tracking-tight flex items-center justify-center gap-1.5 hover:bg-[#e9eedf] transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Get Walking Directions</span>
              </button>
            </div>

            {/* Quick Actions / Report / Claim */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setBookingModalOpen(true)}
                className="w-full bg-[#243b32] text-white py-3 rounded-xl font-display font-black text-xs uppercase tracking-tight hover:bg-[#183e35] transition"
              >
                Request Custom Booking
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="text-[#a7302d] hover:underline"
                >
                  Report a Problem
                </button>

                {!business.isClaimed && (
                  <button
                    onClick={() => setClaimModalOpen(true)}
                    className="text-[#183e35] font-bold hover:underline"
                  >
                    Claim This Shop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SIMILAR BUSINESSES IN THIS CATEGORY */}
        {similarBusinesses.length > 0 && (
          <div className="pt-6 border-t border-[#dfe5d8] space-y-4">
            <h2 className="font-display font-black text-xl text-[#243b32] uppercase tracking-tight">
              More {business.primaryCategory.replace(/-/g, ' ')} nearby
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarBusinesses.map((item) => (
                <BusinessCard key={item.id} business={item} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />

      {/* MODALS */}
      {bookingModalOpen && (
        <BookingModal
          business={business}
          initialService={bookingService}
          onClose={() => {
            setBookingModalOpen(false);
            setBookingService(undefined);
          }}
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
        <div className="fixed bottom-[170px] left-1/2 -translate-x-1/2 bg-[#243b32] text-white text-xs font-bold px-4 py-2 rounded-full signboard-border signboard-shadow-lg z-50">
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}
