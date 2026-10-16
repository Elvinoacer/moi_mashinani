"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { availabilityLabel } from "@/lib/campus-value";
import { CampusUtilityDetails } from "@/components/CampusUtilityDetails";
import { TrustShield } from "@/components/TrustShield";
import { TrustShare } from "@/components/TrustShare";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { BookingModal } from "@/components/BookingModal";
import { ReportModal } from "@/components/ReportModal";
import { ClaimModal } from "@/components/ClaimModal";
import { BusinessCard } from "@/components/BusinessCard";
import { Business } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { useNow } from "@/lib/useNow";
import { trackBusinessEvent } from "@/lib/track-business-event";
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
} from "@/components/icons";

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
  const [business, setBusiness] = useState<Business | null>(
    initialBusiness ?? null,
  );
  const [similarBusinesses, setSimilarBusinesses] =
    useState<Business[]>(initialSimilar);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [loading, setLoading] = useState(initialBusiness === undefined);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string>();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [error, setError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  useEffect(() => {
    if (initialBusiness && initialBusiness.status === "ACTIVE") {
      trackBusinessEvent(initialBusiness.id, "view");
    }
  }, [initialBusiness]);

  useEffect(() => {
    // Only fetch if initialBusiness was not provided
    if (initialBusiness !== undefined) return;

    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/businesses/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This business is not available."
              : data.error || "Could not load the business. Please try again.",
          );
        }
        if (controller.signal.aborted) return;
        setBusiness(data);
        if (data.status === "ACTIVE") trackBusinessEvent(data.id, "view");

        const isFeatured =
          data.activeTier === "FEATURED" &&
          (!data.tierEndsAt ||
            new Date(data.tierEndsAt).getTime() > Date.now());
        if (!isFeatured) {
          const similar = await fetch(
            `/api/businesses?category=${encodeURIComponent(data.primaryCategory)}`,
            { signal: controller.signal },
          );
          if (similar.ok) {
            const related = await similar.json();
            if (!controller.signal.aborted) {
              setSimilarBusinesses(
                (related.results || [])
                  .filter((item: Business) => item.id !== data.id)
                  .slice(0, 3),
              );
            }
          }
        } else {
          setSimilarBusinesses([]);
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Connection error. Please reload.",
          );
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
            {error || "This shop may have changed its address or been removed."}
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

  const galleryPhotos = Array.from(
    new Set([business.coverPhoto, ...business.photos].filter(Boolean)),
  );
  const promotionActive = Boolean(
    business.tierEndsAt && new Date(business.tierEndsAt).getTime() > now,
  );
  const isFeatured = business.activeTier === "FEATURED" && promotionActive;
  const isRecommended =
    business.activeTier === "RECOMMENDED" && promotionActive;
  const isAvailableNow = Boolean(
    !business.isTemporarilyClosed &&
    business.availableNowUntil &&
    new Date(business.availableNowUntil).getTime() > now,
  );

  const handleCall = () => trackBusinessEvent(business.id, "call");
  const serviceTerm = serviceFilter.trim().toLowerCase();
  const visibleServices = serviceTerm
    ? business.services.filter((service) =>
        `${service.name} ${service.unit || ""} ${service.note || ""}`
          .toLowerCase()
          .includes(serviceTerm),
      )
    : business.services;
  const handleWhatsApp = () => trackBusinessEvent(business.id, "whatsapp");

  const handleDirections = () => {
    trackBusinessEvent(business.id, "directions");
    const mapsUrl = business.mapPin
      ? `https://www.google.com/maps/dir/?api=1&destination=${business.mapPin.lat},${business.mapPin.lng}&travelmode=walking`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${business.name} ${business.landmark} Moi University Kesses`,
        )}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
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

  const recipient = (business.whatsapp || business.phone || "").replace(
    /\D/g,
    "",
  );
  const whatsappPhone = recipient.startsWith("0")
    ? "254" + recipient.slice(1)
    : recipient;
  const whatsappMessage = encodeURIComponent(
    `Habari ${business.name}, nimeona profile yako kwa MoiMashinani campus directory. Naomba kuuliza kuhusu huduma zenu.`,
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-36 md:pb-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase"
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/c/${business.primaryCategory}`}
            className="hover:underline"
          >
            {CATEGORIES.find((c) => c.slug === business.primaryCategory)
              ?.name || business.primaryCategory.replace(/-/g, " ")}
          </Link>
          <span>/</span>
          <span className="text-[#243b32] truncate max-w-[200px]">
            {business.name}
          </span>
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
                    activePhotoIdx === i
                      ? "ring-2 ring-[#183e35]"
                      : "opacity-70"
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

            {business.verificationLevel === "L2" ? (
              <span className="bg-white text-[#243b32] font-display font-bold text-xs px-2 py-0.5 rounded signboard-border flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#335e41]" />
                {business.sellerType === "COMRADE"
                  ? "Comrade verified"
                  : "Shopfront verified"}
              </span>
            ) : business.sellerType === "COMRADE" ? (
              <span className="bg-[#fef9c3] text-[#713f12] font-display font-bold text-xs px-2 py-0.5 rounded border border-[#fde047] flex items-center gap-1" title="Meet in public on campus before paying">
                Unverified Comrade Seller
              </span>
            ) : null}

            {isAvailableNow && (
              <span className="bg-[#d9f279]/30 text-[#243b32] font-display font-bold text-xs px-2 py-0.5 rounded border border-[#d9f279] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#335e41]" />
                {availabilityLabel(business, now)}
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
              <span className="uppercase">
                {business.zone.replace(/-/g, " ")}
              </span>
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

        {business.isTemporarilyClosed && (
          <p
            role="status"
            className="rounded-xl border border-[#f0c6bd] bg-[#fce7e1] p-4 text-sm font-bold text-[#a7302d]"
          >
            This business is temporarily closed. You can still call to confirm
            when they reopen, or browse similar shops below.
          </p>
        )}
        {isAvailableNow && business.liveStatus && (
          <p className="rounded-xl border border-[#d9f279] bg-[#edf2e5] p-4 text-sm font-bold text-[#243b32]">
            <span aria-hidden="true">● </span>Live update: {business.liveStatus}
          </p>
        )}

        {/* PRIMARY ACTION BUTTONS */}
        {business.services.length > 0 && <a href="#services-and-prices" className="inline-flex min-h-11 items-center text-sm font-bold text-[#205443] underline underline-offset-4">Jump to item prices ↓</a>}
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
                {business.serviceModes.includes("at_shop") && (
                  <span className="bg-[#e9eedf] text-[#243b32] text-xs font-bold px-2.5 py-1 rounded-full border border-[#dfe5d8]">
                    ✓ Visit Shop
                  </span>
                )}
                {business.serviceModes.includes("comes_to_you") && (
                  <span className="bg-[#e9eedf] text-[#243b32] text-xs font-bold px-2.5 py-1 rounded-full border border-[#dfe5d8]">
                    ✓ Hostel Delivery / Call-out
                  </span>
                )}
              </div>
            </div>

            {/* Services & Price Menu */}
            {business.services && business.services.length > 0 && (
              <div id="services-and-prices" className="bg-white signboard-border signboard-shadow-sm rounded-xl p-4 sm:p-5 space-y-4 scroll-mt-20">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-black text-base text-[#243b32] tracking-tight">
                    Services & Pricing
                  </h2>
                  <span className="text-xs text-[#667064]">
                    Estimated rates
                  </span>
                </div>

                {business.services.length > 5 && (
                  <div className="relative">
                    <label htmlFor="service-filter" className="sr-only">
                      Filter items and prices
                    </label>
                    <input
                      id="service-filter"
                      type="search"
                      value={serviceFilter}
                      onChange={(event) => setServiceFilter(event.target.value)}
                      placeholder={`Search ${business.services.length} items…`}
                      className="ui-input w-full"
                    />
                  </div>
                )}

                <div className="divide-y divide-[#dfe5d8]">
                  {visibleServices.length === 0 && (
                    <p className="py-3 text-sm text-[#667064]">
                      No items match “{serviceFilter}”.{" "}
                      <button
                        type="button"
                        className="font-bold text-[#205443] underline"
                        onClick={() => {
                          setBookingService(undefined);
                          setBookingModalOpen(true);
                        }}
                      >
                        Ask the seller instead
                      </button>
                    </p>
                  )}
                  {visibleServices.map((service, idx) => (
                    <div
                      key={service.id || idx}
                      id={`service-${service.id}`}
                      className="scroll-mt-24 py-3 flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 sm:gap-4"
                    >
                      <div>
                        <span className="font-display font-bold text-sm text-[#243b32] block">
                          {service.name}
                          {service.inStock === false ? " · Out of stock" : ""}
                        </span>
                        {service.unit && (
                          <span className="text-xs text-[#667064]">
                            {service.unit}
                          </span>
                        )}
                        {service.note && (
                          <span className="block text-xs text-[#667064]">
                            {service.note}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-display font-black text-sm text-[#183e35]">
                          {service.priceFrom !== undefined
                            ? `KES ${service.priceFrom.toLocaleString()}`
                            : "Price on inquiry"}
                        </span>
                        <button
                          disabled={
                            service.inStock === false ||
                            business.isTemporarilyClosed
                          }
                          aria-label="WhatsApp"
                          onClick={() => {
                            setBookingService(service.name);
                            setBookingModalOpen(true);
                          }}
                          className="min-h-11 rounded-lg bg-[#243b32] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#183e35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
                        >
                          Ask about this
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
                    <div
                      key={day}
                      className="flex justify-between py-1 border-b border-[#dfe5d8]/50 last:border-0"
                    >
                      <span className="font-bold text-[#243b32] capitalize">
                        {day}
                      </span>
                      <span className="text-[#667064]">
                        {hours.open && hours.close
                          ? `${hours.open} – ${hours.close}`
                          : "Closed"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#667064]">
                    Contact shop directly for exact daily hours.
                  </p>
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

            {/* Quick Actions / Desktop In-App Booking & Claim */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBookingService(undefined);
                  setBookingModalOpen(true);
                }}
                className="w-full hidden sm:flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#243b32] text-white py-2.5 font-display font-bold text-xs uppercase tracking-tight hover:bg-[#183e35] transition"
              >
                📅 Book / Inquire In-App
              </button>
              {!business.isClaimed && (
                <div className="text-center text-xs">
                  <button
                    onClick={() => setClaimModalOpen(true)}
                    className="w-full rounded-xl border border-[#dfe5d8] bg-white py-2.5 font-bold text-[#183e35] hover:bg-[#edf2e5] transition"
                  >
                    Are you the owner? Claim This Shop
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <CampusUtilityDetails business={business} />
        <TrustShield slug={slug} business={business} onReportProblem={() => setReportModalOpen(true)} />
        <TrustShare business={business} />

        {/* SIMILAR BUSINESSES IN THIS CATEGORY - Suppressed on Featured profiles */}
        {business.activeTier === "FEATURED" &&
        (!business.tierEndsAt ||
          new Date(business.tierEndsAt).getTime() > now) ? (
          <div className="pt-6 border-t border-[#dfe5d8]">
            <div className="rounded-2xl border-2 border-[#ffc53d] bg-[#fffdf5] p-5 shadow-[0_4px_16px_rgba(255,197,61,0.15)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffc53d] text-[#243b32] font-black text-xl shadow-sm">
                  <Star className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display font-black text-sm text-[#243b32] uppercase tracking-wide">
                    Featured Campus Partner
                  </p>
                  <p className="text-xs text-[#667064]">
                    This business is an official top-rated priority provider on
                    MoiMashinani with direct customer contact.
                  </p>
                </div>
              </div>
              <Link
                href={`/c/${business.primaryCategory}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#dfe5d8] bg-white px-4 py-2 text-xs font-bold text-[#335e41] hover:bg-[#edf2e5] transition"
              >
                Explore {business.primaryCategory.replace(/-/g, " ")} category →
              </Link>
            </div>
          </div>
        ) : similarBusinesses.length > 0 ? (
          <div className="pt-6 border-t border-[#dfe5d8] space-y-4">
            <h2 className="font-display font-black text-xl text-[#243b32] uppercase tracking-tight">
              More {business.primaryCategory.replace(/-/g, " ")} nearby
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarBusinesses.map((item) => (
                <BusinessCard key={item.id} business={item} />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
      <BottomNav />
      <nav
        aria-label="Contact seller"
        className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] md:hidden"
      >
        <a
          className="ui-button ui-button-secondary flex-1"
          href={`tel:${business.phone}`}
          onClick={handleCall}
        >
          📞 Call
        </a>
        <button
          type="button"
          className="ui-button ui-button-secondary flex-1"
          disabled={business.isTemporarilyClosed}
          onClick={() => {
            setBookingService(undefined);
            setBookingModalOpen(true);
          }}
        >
          📅 Book In-App
        </button>
        <a
          className="ui-button ui-button-whatsapp flex-[1.4]"
          href={whatsappUrl}
          onClick={handleWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 WhatsApp
        </a>
      </nav>

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
