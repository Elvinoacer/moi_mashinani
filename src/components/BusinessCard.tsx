'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useNow } from '@/lib/useNow';
import { Business, Tier } from '@/lib/types';
import { BookingModal } from './BookingModal';
import { ReportModal } from './ReportModal';
import { buildGoogleMapsUrl } from '@/lib/geo';
import {
  Star,
  CheckCircle2,
  MapPin,
  Footprints,
  Tag,
  Phone,
  WhatsAppIcon,
  MoreVertical,
  Navigation,
} from '@/components/icons';

interface BusinessCardProps {
  business: Business;
  effectiveTier?: Tier;
  distanceLabel?: string;
  anchorCoordinates?: { lat: number; lng: number };
  showDirectionsButton?: boolean;
  onCallClick?: () => void;
  onWhatsAppClick?: () => void;
}

export function BusinessCard({
  business,
  effectiveTier,
  distanceLabel,
  anchorCoordinates,
  showDirectionsButton = true,
  onCallClick,
  onWhatsAppClick,
}: BusinessCardProps) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const now = useNow();

  const tier = effectiveTier || business.activeTier;
  const isFeatured = tier === 'FEATURED';
  const isRecommended = tier === 'RECOMMENDED';

  const isAvailableNow = Boolean(
    business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now
  );

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/events',
        JSON.stringify({ businessId: business.id, type: 'call' })
      );
    }
    if (onCallClick) onCallClick();
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/events',
        JSON.stringify({ businessId: business.id, type: 'whatsapp' })
      );
    }
    if (onWhatsAppClick) onWhatsAppClick();
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/events',
        JSON.stringify({ businessId: business.id, type: 'directions' })
      );
    }
    const url = buildGoogleMapsUrl({
      destCoords: business.mapPin,
      originCoords: anchorCoordinates,
      businessName: business.name,
      landmark: business.landmark,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // WhatsApp prefilled message
  const prefilledMsg = encodeURIComponent(
    `Habari ${business.name}, nimeona profile yako kwa MoiMashinani campus directory. Naomba kuuliza kuhusu huduma zenu.`
  );
  const cleanPhone = (business.whatsapp || business.phone).replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0') ? `254${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${waPhone}?text=${prefilledMsg}`;

  const validPrices = (business.services || [])
    .map((s) => s.priceFrom || 0)
    .filter((p) => p > 0);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  const displayDistance = distanceLabel || business.walkTime || 'Near campus';

  return (
    <>
      <div
        className={`bg-white border-[1.5px] border-[#001C3B] rounded-xl shadow-[2px_2px_0px_#001C3B] relative overflow-hidden transition-all duration-100 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#001C3B] ${
          isFeatured ? 'border-l-[6px] border-l-[#FFC53D]' : isRecommended ? 'border-l-[6px] border-l-[#0B6E70]' : ''
        }`}
      >
        <div className="p-3.5 sm:p-4">
          {/* Header Row: Badges & Tier stickers */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {isFeatured && (
                <span className="bg-[#FFC53D] text-[#001C3B] text-[10px] sm:text-[11px] font-display font-black px-2 py-0.5 rounded border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] flex items-center gap-1 uppercase tracking-tight">
                  <Star className="w-3 h-3 fill-[#001C3B]" />
                  FEATURED
                </span>
              )}

              {isRecommended && !isFeatured && (
                <span className="bg-[#0B6E70] text-white text-[10px] sm:text-[11px] font-display font-black px-2 py-0.5 rounded border border-[#001C3B] shadow-[1px_1px_0px_#001C3B] flex items-center gap-1 uppercase tracking-tight">
                  <CheckCircle2 className="w-3 h-3" />
                  RECOMMENDED
                </span>
              )}

              {business.verificationLevel === 'L2' && (
                <span
                  className="bg-white text-[#001C3B] text-[10px] sm:text-[11px] font-display font-bold px-1.5 py-0.5 rounded border border-[#001C3B] flex items-center gap-0.5"
                  title="Team physically verified this shop exists"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#0B6E70]" />
                  Verified
                </span>
              )}

              {isAvailableNow && (
                <span className="bg-[#E7EEFF] text-[#005658] text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                  Available Now
                </span>
              )}
            </div>

            {/* Promoted Disclosure & Report */}
            <div className="flex items-center gap-1 text-[11px] text-[#594045]">
              {(isFeatured || isRecommended) && (
                <span
                  title="Promoted listing. Owner pays to rank higher; results still match relevance."
                  className="cursor-help underline decoration-dotted text-[10px] text-[#594045]"
                >
                  Promoted
                </span>
              )}
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="text-[#8D6F75] hover:text-[#BA1A1A] p-1 press-action rounded"
                title="Report problem"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="flex gap-3 items-start">
            {/* Photo / Thumbnail */}
            <Link href={`/b/${business.slug}`} className="relative shrink-0 block">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-lg border-[1.5px] border-[#001C3B] overflow-hidden bg-[#F0F3FF]">
                {business.coverPhoto || business.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business.coverPhoto || business.photos[0]}
                    alt={business.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#E7EEFF] text-[#001C3B] font-display font-black text-xl">
                    {business.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            {/* Info details */}
            <div className="flex-1 min-w-0">
              <Link href={`/b/${business.slug}`} className="block group">
                <h3 className="font-display font-bold text-base sm:text-lg text-[#001C3B] group-hover:text-[#9B0044] transition-colors leading-snug truncate">
                  {business.name}
                </h3>
              </Link>

              <div className="text-xs text-[#594045] mt-1 line-clamp-1">
                {business.tagline || business.description}
              </div>

              {/* Location & Walk time */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-[#001C3B]">
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C2185B] flex-shrink-0" />
                  <span className="font-semibold capitalize">{business.zone.replace('-', ' ')}</span>
                </span>

                <span className="flex items-center gap-0.5 text-[#594045] font-medium">
                  <Footprints className="w-3.5 h-3.5 flex-shrink-0 text-[#0B6E70]" />
                  <span>{displayDistance}</span>
                </span>

                {lowestPrice > 0 && (
                  <span className="bg-[#F0F3FF] px-1.5 py-0.5 rounded text-[11px] font-bold text-[#001C3B] border border-[#001C3B]/20">
                    from KSh {lowestPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Physical Landmark Tag */}
              {business.landmark && (
                <div className="mt-1 text-[11px] text-[#594045] bg-[#F0F3FF] px-2 py-0.5 rounded border border-[#001C3B]/10 line-clamp-1 flex items-center gap-1">
                  <span className="font-bold text-[#001C3B]">Landmark:</span>
                  <span className="truncate">{business.landmark}</span>
                </div>
              )}

              {/* Student discount tag if exists */}
              {business.studentDiscount && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#795900] bg-[#FFDEA0]/50 border border-[#795900]/30 px-1.5 py-0.5 rounded">
                  <Tag className="w-3 h-3 text-[#795900] flex-shrink-0" />
                  <span className="truncate">{business.studentDiscount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Strip: Directions + Two-Tap Call & WhatsApp */}
        <div className="border-t-[1.5px] border-[#001C3B] bg-[#F9F9FF] p-2 sm:p-2.5">
          <div className="grid grid-cols-12 gap-2">
            {/* Directions button */}
            {showDirectionsButton && (
              <button
                type="button"
                onClick={handleDirections}
                title="Get walking directions in Google Maps"
                className="col-span-4 bg-[#E7EEFF] hover:bg-[#DEE8FF] text-[#001C3B] text-xs font-display font-bold py-2 px-2 rounded-full border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5 text-[#0B6E70] flex-shrink-0" />
                <span className="truncate">MAPS</span>
              </button>
            )}

            {/* Tap 1: Call */}
            <a
              href={`tel:${business.phone}`}
              onClick={handleCall}
              className={`${
                showDirectionsButton ? 'col-span-4' : 'col-span-6'
              } bg-[#C2185B] hover:bg-[#9E1049] text-white text-xs font-display font-bold py-2 px-2 rounded-full border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1`}
            >
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>CALL</span>
            </a>

            {/* Tap 2: WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsApp}
              className={`${
                showDirectionsButton ? 'col-span-4' : 'col-span-6'
              } bg-[#25D366] hover:bg-[#20ba5a] text-[#001C3B] text-xs font-display font-bold py-2 px-2 rounded-full border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1`}
            >
              <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">WHATSAPP</span>
            </a>
          </div>
        </div>
      </div>

      {bookingOpen && (
        <BookingModal
          business={business}
          onClose={() => setBookingOpen(false)}
        />
      )}

      {reportOpen && (
        <ReportModal
          business={business}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}
