'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Business } from '@/lib/types';
import { CategorySelect } from '@/components/CategorySelect';
import { categoryMatches } from '@/lib/categories';
import { BusinessCard } from '@/components/BusinessCard';
import { useNow } from '@/lib/useNow';
import { trackBusinessEvent } from '@/lib/track-business-event';
import {
  CAMPUS_ANCHORS,
  CampusAnchor,
  Coordinates,
  calculateDistanceMeters,
  formatDistanceAndWalkTime,
  computeRadarPosition,
  buildGoogleMapsUrl,
  getCampusOverviewMapUrl,
} from '@/lib/geo';
import {
  Compass,
  Navigation,
  MapPin,
  Footprints,
  ExternalLink,
  Locate,
  Radio,
  CategoryIcon,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Store,
  Map,
  Target,
  Zap,
  ZoomIn,
  Phone,
  WhatsAppIcon,
  Crosshair,
} from '@/components/icons';

interface CampusRadarDiscoveryProps {
  businesses: Business[];
  loading?: boolean;
  defaultZone?: string;
}

const RANGE_OPTIONS = [
  { meters: 250, label: '250m', subtext: '< 3 min walk', zoom: '4x' },
  { meters: 500, label: '500m', subtext: '< 7 min walk', zoom: '2x' },
  { meters: 1000, label: '1.0 km', subtext: '< 14 min walk', zoom: '1x' },
  { meters: 1500, label: '1.5 km', subtext: 'All Kesses', zoom: '0.7x' },
];

const ZONE_FILTERS = [
  { id: 'all', label: 'All Kesses' },
  { id: 'main-gate', label: 'Moi Main Gate' },
  { id: 'kesses-centre', label: 'Kesses Centre' },
  { id: 'stage', label: 'Stage Terminus' },
  { id: 'soweto', label: 'Soweto' },
  { id: 'cheboiywo', label: 'Cheboiywo' },
  { id: 'talai', label: 'Talai' },
];

interface EnrichedBusiness extends Business {
  distanceMeters: number;
  distanceStr: string;
  walkTimeStr: string;
  minutes: number;
  radarPos: { x: number; y: number; distanceMeters: number; bearingDeg: number };
  inRange: boolean;
  isOpen: boolean;
  hasDiscount: boolean;
}

interface DispersedPin extends EnrichedBusiness {
  plotX: number;
  plotY: number;
}

// -------------------------------------------------------------------------
// REUSABLE SPOTLIGHT DETAILS CARD
// -------------------------------------------------------------------------
interface SpotlightCardProps {
  business: EnrichedBusiness | null;
  totalCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  currentCoords: Coordinates;
  selectedRangeMeters: number;
}

function SpotlightCard({
  business,
  totalCount,
  currentIndex,
  onPrev,
  onNext,
  currentCoords,
  selectedRangeMeters,
}: SpotlightCardProps) {
  if (!business) {
    return (
      <div className="p-8 text-center bg-[#F0F3FF] rounded-2xl border-2 border-[#001C3B] shadow-[3px_3px_0px_#001C3B]">
        <Crosshair className="w-8 h-8 text-[#0B6E70] mx-auto mb-2 animate-pulse" />
        <h4 className="font-display font-bold text-base text-[#001C3B]">
          No Target In Selected Range
        </h4>
        <p className="text-xs text-[#594045] mt-1">
          Try expanding range to 1.0 km or 1.5 km or select &quot;All Kesses&quot; to detect shops across campus.
        </p>
      </div>
    );
  }

  const proximityPercent = Math.min(
    100,
    Math.max(8, (business.distanceMeters / selectedRangeMeters) * 100)
  );

  return (
    <div className="bg-[#F9F9FF] border-2 border-[#001C3B] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#001C3B] space-y-4 lg:sticky lg:top-20">
      {/* Target Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#001C3B]/20 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-[#001C3B]">
          <Target className="w-4 h-4 text-[#9B0044]" />
          <span>
            TARGET LOCK #{currentIndex + 1} OF {totalCount}
          </span>
        </div>

        {totalCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#001C3B] bg-white hover:bg-[#E7EEFF] text-[#001C3B] press-action"
              title="Previous target"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={onNext}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#001C3B] bg-white hover:bg-[#E7EEFF] text-[#001C3B] press-action"
              title="Next target"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Main Profile Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase bg-[#FFDEA0] text-[#795900] px-2 py-0.5 rounded border border-[#001C3B]">
              {business.zone.replace('-', ' ')}
            </span>
            {business.activeTier === 'FEATURED' && (
              <span className="text-[10px] font-black uppercase bg-[#FFC53D] text-[#001C3B] px-2 py-0.5 rounded border border-[#001C3B]">
                ★ Featured
              </span>
            )}
            {business.isOpen && (
              <span className="text-[10px] font-bold bg-[#25D366]/20 text-[#005658] border border-[#25D366]/40 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                <span>Open Now</span>
              </span>
            )}
            <span className="text-[10px] font-bold text-[#0B6E70] bg-[#E7EEFF] px-2 py-0.5 rounded">
              ✓ Physical Shop Verified
            </span>
          </div>

          <h3 className="font-display font-black text-xl sm:text-2xl text-[#001C3B] leading-snug">
            {business.name}
          </h3>

          <p className="text-xs text-[#594045] line-clamp-2">
            {business.tagline || business.description}
          </p>
        </div>

        {/* Thumbnail Photo Preview */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-[#001C3B] overflow-hidden bg-white shrink-0 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={business.coverPhoto || business.photos[0]}
            alt={`${business.name} storefront in ${business.zone}, Moi University Kesses`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Proximity & Real Walk Time Block */}
      <div className="bg-white border-2 border-[#001C3B] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#001C3B] flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-[#0B6E70]" />
            <span className="text-sm font-display font-black">{business.walkTimeStr}</span>
          </span>
          <span className="text-xs text-[#0B6E70] font-mono font-bold bg-[#E7EEFF] px-2 py-0.5 rounded border border-[#001C3B]/10">
            {business.distanceStr ? `≈ ${business.distanceStr} away` : 'Near Gate'}
          </span>
        </div>

        {/* Proximity Progress Bar */}
        <div className="w-full bg-[#E7EEFF] rounded-full h-2 overflow-hidden border border-[#001C3B]/20">
          <div
            className="bg-[#0B6E70] h-full rounded-full transition-all duration-300"
            style={{ width: `${proximityPercent}%` }}
          />
        </div>

        {/* Physical Landmark Hint */}
        <div className="text-xs text-[#594045] bg-[#F0F3FF] p-2.5 rounded-lg border border-[#001C3B]/10 leading-relaxed">
          <strong className="text-[#001C3B]">Physical Landmark:</strong> {business.landmark}
        </div>

        {/* GPS Coordinates & Radar Bearing */}
        {business.mapPin && (
          <div className="text-[10px] font-mono text-[#594045] flex items-center justify-between pt-0.5">
            <span>
              GPS: {business.mapPin.lat.toFixed(4)}° N, {business.mapPin.lng.toFixed(4)}° E
            </span>
            <span className="text-[#0B6E70] font-bold">
              Bearing: {business.radarPos.bearingDeg.toFixed(0)}°
            </span>
          </div>
        )}

        {/* Student Discount */}
        {business.studentDiscount && (
          <div className="text-xs bg-[#FFFDF5] text-[#795900] border border-[#FFC53D] p-2 rounded-lg font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#9B0044] shrink-0" />
            <span>{business.studentDiscount}</span>
          </div>
        )}
      </div>

      {/* Instant Action CTAs: 1-Tap Google Maps + Two-Tap Call & WhatsApp */}
      <div className="space-y-2 pt-1">
        <a
          onClick={() => trackBusinessEvent(business.id, 'directions')}
          href={buildGoogleMapsUrl({
            destCoords: business.mapPin,
            originCoords: currentCoords,
            businessName: business.name,
            landmark: business.landmark,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#001C3B] hover:bg-[#0B2545] text-white text-xs font-display font-bold py-3 px-3 rounded-xl border-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4 text-[#FFC53D]" />
          <span>Start Walking Directions in Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            onClick={() => trackBusinessEvent(business.id, 'call')}
            href={`tel:${business.phone}`}
            className="bg-[#C2185B] hover:bg-[#9E1049] text-white text-xs font-display font-bold py-2.5 px-3 rounded-xl border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Shop</span>
          </a>
          <a
            onClick={() => trackBusinessEvent(business.id, 'whatsapp')}
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Habari ${business.name}, nimeona biashara yako kwa MoiMashinani campus directory. Uko open saa hii?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba5a] text-[#001C3B] text-xs font-display font-bold py-2.5 px-3 rounded-xl border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center justify-center gap-1.5"
          >
            <WhatsAppIcon className="w-4 h-4 text-[#001C3B]" />
            <span>WhatsApp</span>
          </a>
        </div>

        <div className="text-center pt-1">
          <Link
            href={`/b/${business.slug}`}
            className="text-xs font-bold text-[#9B0044] hover:underline inline-flex items-center gap-1"
          >
            <span>View full profile & services catalogue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// MAIN INNER COMPONENT
// -------------------------------------------------------------------------
function CampusRadarDiscoveryInner({
  businesses,
  loading = false,
  defaultZone,
}: CampusRadarDiscoveryProps) {
  const searchParams = useSearchParams();
  const urlZone = searchParams?.get('zone') || defaultZone || 'all';

  // 1. Campus Anchor (Where user is currently situated)
  // When urlZone is specified (e.g. 'main-gate', 'stage'), initialize the Anchor from it.
  const [selectedAnchorOverride, setSelectedAnchorOverride] = useState<CampusAnchor | null>(null);
  const selectedAnchor = useMemo(() => {
    if (selectedAnchorOverride) return selectedAnchorOverride;
    if (urlZone && urlZone !== 'all') {
      const match = CAMPUS_ANCHORS.find((a) => a.id === urlZone);
      if (match) return match;
    }
    return CAMPUS_ANCHORS[0]; // Default to Moi Main Gate
  }, [selectedAnchorOverride, urlZone]);

  const [userGpsCoords, setUserGpsCoords] = useState<Coordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 2. Zone Filter: Which zone to isolate (defaults to 'all' = All Kesses, so all nearby shops appear on radar)
  const [filterZone, setFilterZone] = useState<string>('all');

  // 3. Category & Range Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRangeMeters, setSelectedRangeMeters] = useState<number>(1000); // Default to 1.0 km to cover all campus shops
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);

  // 4. View mode: 'radar' | 'map' | 'cards'
  const [viewMode, setViewMode] = useState<'radar' | 'map' | 'cards'>('radar');

  // 5. Interactive Selection & Sweep State
  const [focusedBizId, setFocusedBizId] = useState<string | null>(null);
  const [hoveredBizId, setHoveredBizId] = useState<string | null>(null);
  const [sweepPaused, setSweepPaused] = useState(false);

  const now = useNow();

  // Active reference coordinates (Live GPS or Selected Campus Anchor)
  const currentCoords = userGpsCoords || selectedAnchor.coords;

  const handleAnchorSelect = (anchor: CampusAnchor) => {
    setUserGpsCoords(null);
    setGpsError(null);
    setSelectedAnchorOverride(anchor);
  };

  const handleRequestGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserGpsCoords(coords);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsError('Could not acquire GPS location. Using campus anchor.');
        setUserGpsCoords(null);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Enrich businesses with distance, walk time, open status, and radar coordinates
  const enrichedBusinesses = useMemo<EnrichedBusiness[]>(() => {
    return businesses.map((b) => {
      let distanceMeters = 0;
      let walkTimeStr = b.walkTime || 'Near campus';
      let distanceStr = '';
      let minutes = 5;

      if (b.mapPin) {
        distanceMeters = calculateDistanceMeters(currentCoords, b.mapPin);
        const fmt = formatDistanceAndWalkTime(distanceMeters);
        distanceStr = fmt.distanceStr;
        walkTimeStr = fmt.walkTimeStr;
        minutes = fmt.minutes;
      }

      const radarPos = b.mapPin
        ? computeRadarPosition(currentCoords, b.mapPin, selectedRangeMeters)
        : { x: 0, y: 0, distanceMeters: 500, bearingDeg: 0 };

      const inRange = distanceMeters <= selectedRangeMeters;
      const isOpen = Boolean(
        b.availableNowUntil && new Date(b.availableNowUntil).getTime() > now
      );
      const hasDiscount = Boolean(b.studentDiscount);

      return {
        ...b,
        distanceMeters,
        distanceStr,
        walkTimeStr,
        minutes,
        radarPos,
        inRange,
        isOpen,
        hasDiscount,
      };
    });
  }, [businesses, currentCoords, selectedRangeMeters, now]);

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    let list = enrichedBusinesses;

    if (filterZone !== 'all') {
      list = list.filter((b) => b.zone === filterZone);
    }

    if (selectedCategory !== 'all') {
      list = list.filter(
        (b) =>
          categoryMatches(b, selectedCategory)
      );
    }

    if (openNowOnly) {
      list = list.filter((b) => b.isOpen);
    }

    if (dealsOnly) {
      list = list.filter((b) => b.hasDiscount);
    }

    return list.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [enrichedBusinesses, filterZone, selectedCategory, openNowOnly, dealsOnly]);

  // Businesses visible on the active radar scope
  const radarBusinesses = useMemo(() => {
    return filteredBusinesses.filter((b) => b.inRange);
  }, [filteredBusinesses]);

  // Focused business for spotlight card (falls back to closest)
  const focusedBiz = useMemo(() => {
    if (focusedBizId) {
      const match = filteredBusinesses.find((b) => b.id === focusedBizId);
      if (match) return match;
    }
    return filteredBusinesses[0] || null;
  }, [focusedBizId, filteredBusinesses]);

  // Zone counts
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = { all: businesses.length };
    for (const b of businesses) {
      counts[b.zone] = (counts[b.zone] || 0) + 1;
    }
    return counts;
  }, [businesses]);

  // Robust Anti-collision pin dispersion for radar
  const dispersedRadarPins = useMemo<DispersedPin[]>(() => {
    const pins: DispersedPin[] = radarBusinesses.map((b) => {
      // Map base radar coordinates (-44 to +44) to percentage displacement from center (-38.46% to +38.46%)
      let plotX = (b.radarPos.x / 44) * 38.46;
      let plotY = (b.radarPos.y / 44) * 38.46;

      // If extremely close to center (< 3.2%), offset slightly along bearing so it does not overlap center reticle
      const centerDist = Math.hypot(plotX, plotY);
      if (centerDist < 3.2) {
        const angle =
          centerDist > 0.1
            ? Math.atan2(plotY, plotX)
            : ((b.radarPos.bearingDeg - 90) * Math.PI) / 180;
        plotX = Math.cos(angle) * 3.6;
        plotY = Math.sin(angle) * 3.6;
      }

      return {
        ...b,
        plotX,
        plotY,
      };
    });

    // Iterative repulsion relaxation between close pins
    const MIN_DIST = 6.0; // minimum percentage separation (~25px on 420px radar)
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < pins.length; i++) {
        for (let j = i + 1; j < pins.length; j++) {
          let dx = pins[j].plotX - pins[i].plotX;
          let dy = pins[j].plotY - pins[i].plotY;
          let dist = Math.hypot(dx, dy);

          if (dist < MIN_DIST) {
            if (dist < 0.1) {
              dx = (i % 2 === 0 ? 1 : -1) * 0.3;
              dy = (j % 2 === 0 ? 1 : -1) * 0.3;
              dist = Math.hypot(dx, dy) || 0.1;
            }
            const overlap = (MIN_DIST - dist) / 2;
            const nx = (dx / dist) * overlap;
            const ny = (dy / dist) * overlap;

            pins[i].plotX -= nx;
            pins[i].plotY -= ny;
            pins[j].plotX += nx;
            pins[j].plotY += ny;

            // Clamp both within outer distance ring (38.0%)
            const rI = Math.hypot(pins[i].plotX, pins[i].plotY);
            if (rI > 38.0) {
              pins[i].plotX = (pins[i].plotX / rI) * 38.0;
              pins[i].plotY = (pins[i].plotY / rI) * 38.0;
            }
            const rJ = Math.hypot(pins[j].plotX, pins[j].plotY);
            if (rJ > 38.0) {
              pins[j].plotX = (pins[j].plotX / rJ) * 38.0;
              pins[j].plotY = (pins[j].plotY / rJ) * 38.0;
            }
          }
        }
      }
    }

    return pins;
  }, [radarBusinesses]);

  // Target cycling
  const handleCycleTarget = (direction: 'prev' | 'next') => {
    if (filteredBusinesses.length <= 1) return;
    const currentIndex = filteredBusinesses.findIndex((b) => b.id === focusedBiz?.id);
    if (currentIndex === -1) {
      setFocusedBizId(filteredBusinesses[0].id);
      return;
    }
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % filteredBusinesses.length;
      setFocusedBizId(filteredBusinesses[nextIndex].id);
    } else {
      const prevIndex =
        (currentIndex - 1 + filteredBusinesses.length) % filteredBusinesses.length;
      setFocusedBizId(filteredBusinesses[prevIndex].id);
    }
  };

  // Concentric ring distance labels based on active range
  const ringDistances = useMemo(() => {
    const step = selectedRangeMeters / 4;
    return [
      step < 1000 ? `${Math.round(step)}m` : `${(step / 1000).toFixed(1)}km`,
      step * 2 < 1000 ? `${Math.round(step * 2)}m` : `${((step * 2) / 1000).toFixed(1)}km`,
      step * 3 < 1000 ? `${Math.round(step * 3)}m` : `${((step * 3) / 1000).toFixed(1)}km`,
      selectedRangeMeters < 1000
        ? `${selectedRangeMeters}m`
        : `${(selectedRangeMeters / 1000).toFixed(1)}km`,
    ];
  }, [selectedRangeMeters]);

  return (
    <section className="bg-white border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 relative overflow-hidden">
      {/* HEADER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-[#001C3B]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#E7EEFF] text-[#0B6E70] text-xs font-display font-bold px-3 py-1 rounded-full border border-[#001C3B] mb-2">
            <Radio className="w-3.5 h-3.5 text-[#9B0044] animate-pulse" />
            <span>AUTHENTIC CAMPUS SONAR RADAR & LOCATION NAVIGATOR</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#001C3B] uppercase tracking-tight">
            Explore Businesses Around Moi Campus
          </h2>
          <p className="text-xs sm:text-sm text-[#594045] mt-1 max-w-2xl font-body">
            Authentic sonar radar with concentric distance rings, live walking times, radial crosshairs, and schematic campus road maps connecting Moi Main Gate to student hostels.
          </p>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={getCampusOverviewMapUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#001C3B] hover:bg-[#0B2545] text-white text-xs font-display font-bold px-3.5 py-2 rounded-xl border-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5 text-[#FFC53D]" />
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-75" />
          </a>

          {/* View Mode Switcher Pills */}
          <div className="inline-flex rounded-xl border-2 border-[#001C3B] bg-[#F0F3FF] p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 text-xs font-display font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'radar'
                  ? 'bg-[#001C3B] text-white shadow-sm'
                  : 'text-[#001C3B] hover:bg-white/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#FFC53D]" />
              <span>Sonar Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-display font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-[#001C3B] text-white shadow-sm'
                  : 'text-[#001C3B] hover:bg-white/60'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-[#0B6E70]" />
              <span>Campus Map</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-display font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-[#001C3B] text-white shadow-sm'
                  : 'text-[#001C3B] hover:bg-white/60'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-[#C2185B]" />
              <span>Cards ({filteredBusinesses.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 1: CAMPUS ANCHOR SWITCHER */}
      <div className="bg-[#F0F3FF] border-2 border-[#001C3B] rounded-xl p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#C2185B]" />
            <span className="text-xs font-display font-bold text-[#001C3B] uppercase tracking-wide">
              Step 1: Set Your Campus Location (Live Walking Times from Here):
            </span>
          </div>

          {/* Live GPS button */}
          <button
            type="button"
            onClick={handleRequestGps}
            disabled={gpsLoading}
            className={`text-xs font-display font-bold px-3 py-1 rounded-full border border-[#001C3B] flex items-center gap-1.5 press-action transition-colors ${
              userGpsCoords
                ? 'bg-[#25D366] text-[#001C3B]'
                : 'bg-white hover:bg-[#DEE8FF] text-[#001C3B]'
            }`}
          >
            <Locate className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>
              {gpsLoading ? 'Locating...' : userGpsCoords ? '✓ Using Live GPS' : 'Use My GPS Location'}
            </span>
          </button>
        </div>

        {/* Anchors Pills */}
        <div className="flex flex-wrap gap-2">
          {CAMPUS_ANCHORS.map((anchor) => {
            const isSelected = !userGpsCoords && selectedAnchor.id === anchor.id;
            return (
              <button
                key={anchor.id}
                type="button"
                onClick={() => handleAnchorSelect(anchor)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-[1.5px] border-[#001C3B] press-action flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-[#001C3B] text-white shadow-[2px_2px_0px_#001C3B]'
                    : 'bg-white hover:bg-[#E7EEFF] text-[#001C3B] shadow-[1px_1px_0px_#001C3B]'
                }`}
              >
                <span>{anchor.shortName}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC53D]"></span>}
              </button>
            );
          })}
        </div>

        {gpsError && (
          <div className="text-xs text-[#BA1A1A] font-semibold">{gpsError}</div>
        )}

        <div className="text-[11px] text-[#594045] flex items-center gap-1">
          <span className="font-bold text-[#001C3B]">Current reference point:</span>
          <span>
            {userGpsCoords
              ? `Live Device Coordinates (${userGpsCoords.lat.toFixed(4)}, ${userGpsCoords.lng.toFixed(4)})`
              : `${selectedAnchor.name} (${selectedAnchor.landmark})`}
          </span>
        </div>
      </div>

      {/* STEP 2: RANGE ZOOM & FILTER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#FFFDF5] border-2 border-[#001C3B] rounded-xl p-3.5 sm:p-4">
        {/* Range Zoom Controls */}
        <div className="md:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#594045] uppercase tracking-wider flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-[#0B6E70]" />
              <span>Sonar Range Zoom:</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-[#0B6E70]">
              {selectedRangeMeters}m radius
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {RANGE_OPTIONS.map((opt) => {
              const active = selectedRangeMeters === opt.meters;
              return (
                <button
                  key={opt.meters}
                  type="button"
                  onClick={() => setSelectedRangeMeters(opt.meters)}
                  className={`text-center py-1.5 px-1 rounded-lg border-[1.5px] border-[#001C3B] text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#001C3B] text-white shadow-[2px_2px_0px_#001C3B]'
                      : 'bg-white hover:bg-[#E7EEFF] text-[#001C3B]'
                  }`}
                >
                  <div className="leading-tight">{opt.label}</div>
                  <div className={`text-[9px] ${active ? 'text-[#FFC53D]' : 'text-[#594045]'}`}>
                    {opt.subtext}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Filter Toggles & Quick Stats */}
        <div className="md:col-span-7 flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-[#001C3B]/20 md:pl-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Open Now Filter */}
            <button
              type="button"
              onClick={() => setOpenNowOnly(!openNowOnly)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border-[1.5px] border-[#001C3B] press-action flex items-center gap-1.5 transition-all ${
                openNowOnly
                  ? 'bg-[#25D366] text-[#001C3B] shadow-[2px_2px_0px_#001C3B]'
                  : 'bg-white hover:bg-[#E7EEFF] text-[#001C3B]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  openNowOnly ? 'bg-[#001C3B]' : 'bg-[#25D366] animate-pulse'
                }`}
              />
              <span>Open Right Now</span>
            </button>

            {/* Student Deals Filter */}
            <button
              type="button"
              onClick={() => setDealsOnly(!dealsOnly)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border-[1.5px] border-[#001C3B] press-action flex items-center gap-1.5 transition-all ${
                dealsOnly
                  ? 'bg-[#FFC53D] text-[#001C3B] shadow-[2px_2px_0px_#001C3B]'
                  : 'bg-white hover:bg-[#E7EEFF] text-[#001C3B]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#9B0044]" />
              <span>Student Deals</span>
            </button>
          </div>

          {/* Matches Counter */}
          <div className="text-[11px] font-bold text-[#001C3B] bg-[#E7EEFF] px-3 py-1.5 rounded-lg border border-[#001C3B]">
            <span>
              {radarBusinesses.length} in range ({filteredBusinesses.length} total)
            </span>
          </div>
        </div>
      </div>

      {/* ZONE & CATEGORY FILTER CHIPS */}
      <div className="space-y-2.5">
        {/* Zone chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-bold text-[#594045] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#0B6E70]" />
            <span>Zone:</span>
          </span>
          {ZONE_FILTERS.map((z) => {
            const count = zoneCounts[z.id] || 0;
            const active = filterZone === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setFilterZone(z.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border border-[#001C3B] press-action flex items-center gap-1.5 shrink-0 transition-all ${
                  active
                    ? 'bg-[#9B0044] text-white shadow-[1px_1px_0px_#001C3B]'
                    : 'bg-[#F9F9FF] hover:bg-white text-[#001C3B]'
                }`}
              >
                <span>{z.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 rounded-full ${
                    active ? 'bg-white text-[#9B0044]' : 'bg-[#E7EEFF] text-[#001C3B]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="max-w-md"><CategorySelect allowAll value={selectedCategory === 'all' ? '' : selectedCategory} onChange={value => setSelectedCategory(value || 'all')} /></div>
      </div>

      {/* VIEW MODE 1: AUTHENTIC SONAR RADAR */}
      {viewMode === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Circular Sonar Radar Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Radar Instrument Cockpit Box */}
            <div className="w-full max-w-[450px] bg-[#020B14] rounded-2xl border-4 border-[#001C3B] shadow-[6px_6px_0px_#001C3B] p-3 text-emerald-400 font-mono relative overflow-hidden select-none">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between text-[10px] uppercase pb-2 px-1 border-b border-emerald-500/20 tracking-wider">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sweepPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span>{sweepPaused ? 'SWEEP PAUSED' : 'ACTIVE SCAN'}</span>
                </div>
                <div className="text-emerald-400/80">
                  RANGE: {selectedRangeMeters}M
                </div>
                <div className="text-[#FFC53D] font-bold">
                  {radarBusinesses.length} LOCKS
                </div>
                <button
                  type="button"
                  onClick={() => setSweepPaused(!sweepPaused)}
                  className="px-1.5 py-0.5 rounded border border-emerald-500/40 text-[9px] hover:bg-emerald-950/60 text-emerald-300 transition-colors"
                >
                  {sweepPaused ? 'RESUME' : 'PAUSE'}
                </button>
              </div>

              {/* RADAR SCOPE CIRCLE */}
              <div className="relative w-full aspect-square my-2 rounded-full bg-[#001322] border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center">
                {/* SVG Tactical Grid Layer */}
                <svg
                  viewBox="0 0 520 520"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0B6E70" stopOpacity="0.18" />
                      <stop offset="70%" stopColor="#001C3B" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#000A14" stopOpacity="0.95" />
                    </radialGradient>
                  </defs>

                  {/* Sonar Background glow */}
                  <circle cx="260" cy="260" r="230" fill="url(#radarGlow)" />

                  {/* Outer Bezel Rim */}
                  <circle
                    cx="260"
                    cy="260"
                    r="228"
                    fill="none"
                    stroke="#0B6E70"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                  />

                  {/* Degree Ticks around perimeter (every 10 deg) */}
                  {Array.from({ length: 36 }).map((_, i) => {
                    const angleDeg = i * 10;
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const isMajor = angleDeg % 30 === 0;
                    const isCardinal = angleDeg % 90 === 0;
                    const rOuter = 227;
                    const rInner = isCardinal ? 210 : isMajor ? 215 : 220;

                    const x1 = 260 + Math.cos(angleRad) * rInner;
                    const y1 = 260 + Math.sin(angleRad) * rInner;
                    const x2 = 260 + Math.cos(angleRad) * rOuter;
                    const y2 = 260 + Math.sin(angleRad) * rOuter;

                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isCardinal ? '#34D399' : isMajor ? '#10B981' : '#047857'}
                        strokeWidth={isCardinal ? 2 : isMajor ? 1.5 : 1}
                        strokeOpacity={isCardinal ? 0.9 : 0.6}
                      />
                    );
                  })}

                  {/* Concentric Distance Rings: True Circles at 25%, 50%, 75%, 100% of R (200px) */}
                  {[50, 100, 150, 200].map((r, idx) => (
                    <g key={r}>
                      <circle
                        cx="260"
                        cy="260"
                        r={r}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="1.2"
                        strokeOpacity={idx === 3 ? 0.5 : 0.3}
                        strokeDasharray={idx < 3 ? '4 4' : undefined}
                      />
                      {/* Distance Label along North Axis */}
                      <rect
                        x={242}
                        y={260 - r - 8}
                        width={36}
                        height={12}
                        rx={2}
                        fill="#020B14"
                        fillOpacity="0.88"
                      />
                      <text
                        x="260"
                        y={260 - r + 1}
                        fill="#34D399"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {ringDistances[idx]}
                      </text>
                    </g>
                  ))}

                  {/* Crosshairs: North-South and East-West */}
                  <line
                    x1="260"
                    y1="34"
                    x2="260"
                    y2="486"
                    stroke="#10B981"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <line
                    x1="34"
                    y1="260"
                    x2="486"
                    y2="260"
                    stroke="#10B981"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />

                  {/* 45 degree diagonal spokes */}
                  <line
                    x1="118"
                    y1="118"
                    x2="402"
                    y2="402"
                    stroke="#10B981"
                    strokeWidth="0.8"
                    strokeOpacity="0.2"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="402"
                    y1="118"
                    x2="118"
                    y2="402"
                    stroke="#10B981"
                    strokeWidth="0.8"
                    strokeOpacity="0.2"
                    strokeDasharray="3 3"
                  />

                  {/* Center Tactical Reticle Pip (Crisp & Non-Occluding) */}
                  <circle
                    cx="260"
                    cy="260"
                    r="9"
                    fill="none"
                    stroke="#FFC53D"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                  />
                  <circle cx="260" cy="260" r="3.5" fill="#FFC53D" />

                  {/* Cardinal & Campus Zone Labels with safe bounds */}
                  {/* North (000 deg) - Cheboiywo */}
                  <rect
                    x="180"
                    y="8"
                    width="160"
                    height="18"
                    rx="4"
                    fill="#020B14"
                    fillOpacity="0.92"
                    stroke="#10B981"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                  />
                  <text
                    x="260"
                    y="21"
                    fill="#FFC53D"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    000° · N (CHEBOIYWO)
                  </text>

                  {/* East (090 deg) - Soweto */}
                  <rect
                    x="372"
                    y="251"
                    width="136"
                    height="18"
                    rx="4"
                    fill="#020B14"
                    fillOpacity="0.92"
                    stroke="#10B981"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                  />
                  <text
                    x="440"
                    y="264"
                    fill="#FFC53D"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    090° · E (SOWETO)
                  </text>

                  {/* South (180 deg) - Talai & Stage */}
                  <rect
                    x="170"
                    y="494"
                    width="180"
                    height="18"
                    rx="4"
                    fill="#020B14"
                    fillOpacity="0.92"
                    stroke="#10B981"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                  />
                  <text
                    x="260"
                    y="507"
                    fill="#FFC53D"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    180° · S (TALAI / STAGE)
                  </text>

                  {/* West (270 deg) - Kesses Centre */}
                  <rect
                    x="12"
                    y="251"
                    width="146"
                    height="18"
                    rx="4"
                    fill="#020B14"
                    fillOpacity="0.92"
                    stroke="#10B981"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                  />
                  <text
                    x="85"
                    y="264"
                    fill="#FFC53D"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    270° · W (CENTRE)
                  </text>
                </svg>

                {/* Animated Rotating Radar Sweep Beam with Aligned Phosphor Tail */}
                <div
                  className={`absolute inset-0 rounded-full pointer-events-none ${
                    sweepPaused ? '' : 'animate-[spin_4s_linear_infinite]'
                  }`}
                  style={{
                    background:
                      'conic-gradient(from 285deg at 50% 50%, transparent 0deg, rgba(16, 185, 129, 0.02) 20deg, rgba(16, 185, 129, 0.12) 48deg, rgba(52, 211, 153, 0.42) 72deg, rgba(167, 243, 208, 0.85) 75deg, transparent 75deg, transparent 360deg)',
                  }}
                >
                  {/* Leading edge neon line aligned to 0° (North) */}
                  <div className="absolute top-0 left-1/2 w-[2px] h-1/2 -translate-x-1/2 bg-gradient-to-t from-emerald-400 via-emerald-300 to-emerald-100 shadow-[0_0_12px_#34D399]" />
                </div>

                {/* Periodic expanding sonar wave ripple */}
                {!sweepPaused && (
                  <div className="absolute w-24 h-24 rounded-full border border-emerald-400/40 animate-ping pointer-events-none" />
                )}

                {/* Interactive Business Sonar Blips */}
                {dispersedRadarPins.map((b) => {
                  const isFocused = focusedBiz?.id === b.id;
                  const isHovered = hoveredBizId === b.id;

                  // Convert plotX, plotY (-38.46% to +38.46%) to absolute percentage on radar circle
                  const leftPercent = 50 + b.plotX;
                  const topPercent = 50 + b.plotY;

                  return (
                    <div
                      key={b.id}
                      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-40"
                    >
                      {/* Interactive Blip Button with 36x36px comfortable hit box */}
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedBizId(b.id);
                        }}
                        onMouseEnter={() => setHoveredBizId(b.id)}
                        onMouseLeave={() => setHoveredBizId(null)}
                        className={`relative p-1.5 flex items-center justify-center transition-transform ${
                          isFocused ? 'scale-125 z-50' : 'hover:scale-115'
                        }`}
                        title={`${b.name} (${b.walkTimeStr})`}
                      >
                        {/* Sonar Ping Ring Pulse for active blip */}
                        <span
                          className={`absolute inset-0 rounded-full animate-ping opacity-60 pointer-events-none ${
                            isFocused
                              ? 'bg-[#C2185B]'
                              : b.activeTier === 'FEATURED'
                              ? 'bg-[#FFC53D]'
                              : b.isOpen
                              ? 'bg-[#25D366]'
                              : 'bg-[#0B6E70]'
                          }`}
                        />

                        {/* Blip Icon Circle */}
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                            isFocused
                              ? 'bg-[#C2185B] text-white border-white ring-2 ring-[#FFC53D] shadow-[0_0_12px_#C2185B]'
                              : b.activeTier === 'FEATURED'
                              ? 'bg-[#FFC53D] text-[#001C3B] border-white shadow-[0_0_8px_#FFC53D]'
                              : b.isOpen
                              ? 'bg-[#25D366] text-[#001C3B] border-white shadow-[0_0_8px_#25D366]'
                              : 'bg-[#0B6E70] text-white border-white'
                          }`}
                        >
                          <CategoryIcon slug={b.primaryCategory} className="w-3.5 h-3.5" />
                        </div>

                        {/* Lock Reticle brackets when focused */}
                        {isFocused && (
                          <div className="absolute -inset-1 border border-[#FFC53D]/90 rounded-full animate-pulse pointer-events-none" />
                        )}
                      </button>

                      {/* Floating HUD Tooltip strictly on hover */}
                      {isHovered && (
                        <div
                          className={`absolute z-50 pointer-events-none transition-all ${
                            topPercent > 50 ? '-top-14' : 'top-10'
                          } ${
                            leftPercent > 50 ? '-right-4' : '-left-4'
                          } w-44 bg-[#020B14]/95 border border-emerald-400 text-white rounded-lg p-2 shadow-2xl backdrop-blur-sm`}
                        >
                          <div className="text-[10px] font-bold text-white truncate leading-tight">
                            {b.name}
                          </div>
                          <div className="text-[9px] text-emerald-300 flex items-center justify-between mt-0.5">
                            <span>{b.walkTimeStr}</span>
                            <span className="font-mono text-[9px] text-[#FFC53D]">
                              {b.distanceStr}
                            </span>
                          </div>
                          <div className="text-[8px] text-[#A5D6A7] mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                            <span>{b.zone.replace('-', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Scope Footer Status Readout */}
              <div className="flex items-center justify-between text-[10px] pt-2 px-1 border-t border-emerald-500/20 text-emerald-400/90 font-mono">
                <div>
                  ANCHOR: {userGpsCoords ? 'LIVE GPS' : selectedAnchor.shortName.toUpperCase()}
                </div>
                <div className="text-[#FFC53D] truncate max-w-[180px]">
                  TARGET: {focusedBiz?.name || 'NONE'}
                </div>
              </div>
            </div>

            {/* Radar Legend Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[11px] text-[#594045]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#C2185B] border border-[#001C3B] ring-2 ring-[#FFC53D]" />
                <span className="font-semibold text-[#001C3B]">Selected Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFC53D] border border-[#001C3B]" />
                <span>★ Featured Shop</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] border border-[#001C3B]" />
                <span>⚡ Open Right Now</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B6E70] border border-[#001C3B]" />
                <span>Verified Fundi</span>
              </div>
            </div>
          </div>

          {/* SPOTLIGHT DETAILS CARD (Beside Radar on Desktop, Below on Mobile) */}
          <div className="lg:col-span-5 space-y-4">
            <SpotlightCard
              business={focusedBiz}
              totalCount={filteredBusinesses.length}
              currentIndex={filteredBusinesses.findIndex((b) => b.id === focusedBiz?.id)}
              onPrev={() => handleCycleTarget('prev')}
              onNext={() => handleCycleTarget('next')}
              currentCoords={currentCoords}
              selectedRangeMeters={selectedRangeMeters}
            />
          </div>
        </div>
      )}

      {/* VIEW MODE 2: INTERACTIVE SCHEMATIC CAMPUS MAP */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-[#F0F4F8] border-2 border-[#001C3B] rounded-2xl p-4 shadow-[4px_4px_0px_#001C3B] relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[#001C3B]/20">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-[#0B6E70]" />
                  <span className="font-display font-bold text-xs uppercase text-[#001C3B]">
                    Moi University Main Campus Schematic Map (Kesses)
                  </span>
                </div>
                <span className="text-[10px] text-[#594045] font-bold">
                  Tap any landmark or fundi pin
                </span>
              </div>

              {/* Interactive Vector Map SVG Canvas */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] my-2 bg-[#E9EEF4] rounded-xl border border-[#001C3B]/30 overflow-hidden">
                <svg viewBox="0 0 800 500" className="w-full h-full">
                  {/* Background grid */}
                  <pattern
                    id="campusGrid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="#D1DCE5"
                      strokeWidth="0.8"
                    />
                  </pattern>
                  <rect width="800" height="500" fill="url(#campusGrid)" />

                  {/* Campus Zones Background Shapes */}
                  {/* Zone 1: Moi University Campus (Admin / Academic) */}
                  <path
                    d="M 40,160 Q 180,120 280,180 T 320,340 L 40,340 Z"
                    fill="#E8F5E9"
                    stroke="#81C784"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <text
                    x="120"
                    y="240"
                    fill="#2E7D32"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    MOI UNIVERSITY CAMPUS GROUNDS
                  </text>
                  <text
                    x="120"
                    y="258"
                    fill="#388E3C"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    (Administration, Library & Lecture Halls)
                  </text>

                  {/* Zone 2: Cheboiywo Hostels Corridor (Northwest) */}
                  <rect
                    x="180"
                    y="30"
                    width="220"
                    height="90"
                    rx="8"
                    fill="#E0F2F1"
                    stroke="#80CBC4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="195"
                    y="55"
                    fill="#00695C"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    CHEBOIYWO HOSTELS CORRIDOR
                  </text>
                  <text x="195" y="70" fill="#00796B" fontSize="9">
                    Market Road · St. Jude · Gas delivery
                  </text>

                  {/* Zone 3: Soweto Residential Cluster (Northeast) */}
                  <rect
                    x="460"
                    y="40"
                    width="280"
                    height="110"
                    rx="8"
                    fill="#FCE4EC"
                    stroke="#F48FB1"
                    strokeWidth="1.5"
                  />
                  <text
                    x="475"
                    y="65"
                    fill="#AD1457"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    SOWETO STUDENT QUARTER
                  </text>
                  <text x="475" y="80" fill="#C2185B" fontSize="9">
                    Green Valley · Sunrise food row · Hostels
                  </text>

                  {/* Zone 4: Kesses Commercial Centre (Directly behind Gate) */}
                  <rect
                    x="340"
                    y="190"
                    width="160"
                    height="100"
                    rx="8"
                    fill="#FFF8E1"
                    stroke="#FFE082"
                    strokeWidth="2"
                  />
                  <text
                    x="350"
                    y="215"
                    fill="#795900"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    KESSES CENTRE
                  </text>
                  <text x="350" y="230" fill="#8D6E63" fontSize="9">
                    Equity Agent · Cybers · Kiosks
                  </text>

                  {/* Zone 5: Stage Transport Terminus (South) */}
                  <rect
                    x="440"
                    y="320"
                    width="200"
                    height="85"
                    rx="8"
                    fill="#EDE7F6"
                    stroke="#D1C4E9"
                    strokeWidth="1.5"
                  />
                  <text
                    x="455"
                    y="345"
                    fill="#4527A0"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    STAGE TERMINUS
                  </text>
                  <text x="455" y="360" fill="#5E35B1" fontSize="9">
                    Bata · Matatu Shuttles · Stage Mall
                  </text>

                  {/* Zone 6: Talai Corridor (Southeast) */}
                  <rect
                    x="520"
                    y="420"
                    width="240"
                    height="65"
                    rx="8"
                    fill="#E3F2FD"
                    stroke="#90CAF9"
                    strokeWidth="1.5"
                  />
                  <text
                    x="535"
                    y="445"
                    fill="#1565C0"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    TALAI CORRIDOR
                  </text>
                  <text x="535" y="460" fill="#1976D2" fontSize="9">
                    Deliverance Church · Hostels
                  </text>

                  {/* ROAD AXES */}
                  {/* Road 1: Kesses - Cheptiret Highway */}
                  <path
                    d="M 50,470 L 420,380 L 520,340 L 720,200 L 780,180"
                    fill="none"
                    stroke="#5A6D80"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 50,470 L 420,380 L 520,340 L 720,200 L 780,180"
                    fill="none"
                    stroke="#FFC53D"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                  />
                  <text
                    x="600"
                    y="270"
                    fill="#37474F"
                    fontSize="10"
                    fontWeight="bold"
                    transform="rotate(-30 600,270)"
                  >
                    Kesses - Cheptiret Highway
                  </text>

                  {/* Road 2: Main Gate Boulevard */}
                  <path
                    d="M 270,230 L 370,230"
                    fill="none"
                    stroke="#5A6D80"
                    strokeWidth="12"
                  />
                  <path
                    d="M 270,230 L 370,230"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Road 3: Cheboiywo Road */}
                  <path
                    d="M 330,220 L 290,120 L 270,60"
                    fill="none"
                    stroke="#5A6D80"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <text
                    x="250"
                    y="150"
                    fill="#37474F"
                    fontSize="9"
                    fontWeight="bold"
                    transform="rotate(-65 250,150)"
                  >
                    Cheboiywo Rd
                  </text>

                  {/* Road 4: Soweto Walking Avenue */}
                  <path
                    d="M 370,210 L 480,150 L 560,110"
                    fill="none"
                    stroke="#5A6D80"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <text
                    x="440"
                    y="165"
                    fill="#37474F"
                    fontSize="9"
                    fontWeight="bold"
                    transform="rotate(-25 440,165)"
                  >
                    Soweto Path
                  </text>

                  {/* Walking Trails with Minutes */}
                  {/* Gate to Stage walk path */}
                  <path
                    d="M 310,245 Q 360,310 440,340"
                    fill="none"
                    stroke="#0B6E70"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                  <rect x="345" y="285" width="80" height="15" rx="3" fill="#0B6E70" />
                  <text
                    x="385"
                    y="296"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Gate ↔ Stage 5 min
                  </text>

                  {/* Gate to Soweto walk path */}
                  <path
                    d="M 310,215 Q 400,160 480,120"
                    fill="none"
                    stroke="#9B0044"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                  <rect x="365" y="145" width="90" height="15" rx="3" fill="#9B0044" />
                  <text
                    x="410"
                    y="156"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Gate ↔ Soweto 7 min
                  </text>

                  {/* LANDMARKS WITH ICONS */}
                  {/* Landmark: Moi Main Gate */}
                  <g
                    className="cursor-pointer"
                    onClick={() => handleAnchorSelect(CAMPUS_ANCHORS[0])}
                  >
                    <circle
                      cx="300"
                      cy="230"
                      r="14"
                      fill="#001C3B"
                      stroke="#FFC53D"
                      strokeWidth="3"
                    />
                    <text
                      x="300"
                      y="235"
                      fill="#FFC53D"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🏛️
                    </text>
                    <rect x="235" y="248" width="130" height="18" rx="4" fill="#001C3B" />
                    <text
                      x="300"
                      y="261"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Moi Main Gate (0 min)
                    </text>
                  </g>

                  {/* Landmark: Library */}
                  <g>
                    <rect
                      x="150"
                      y="170"
                      width="70"
                      height="35"
                      rx="4"
                      fill="#0B6E70"
                      stroke="#001C3B"
                      strokeWidth="1.5"
                    />
                    <text
                      x="185"
                      y="192"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      📚 Library
                    </text>
                  </g>

                  {/* Landmark: Stage Complex */}
                  <g
                    className="cursor-pointer"
                    onClick={() => {
                      const st = CAMPUS_ANCHORS.find((a) => a.id === 'stage');
                      if (st) handleAnchorSelect(st);
                    }}
                  >
                    <circle
                      cx="510"
                      cy="355"
                      r="12"
                      fill="#4527A0"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x="510"
                      y="360"
                      fill="#FFFFFF"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      🚌
                    </text>
                  </g>

                  {/* PLOTTED BUSINESS PINS ON CAMPUS MAP */}
                  {filteredBusinesses.map((b) => {
                    const isFocused = focusedBiz?.id === b.id;

                    // Compute schematic map coordinates based on zone & mapPin
                    let mapX = 350;
                    let mapY = 220;

                    if (b.zone === 'main-gate') {
                      mapX = 320 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2905) * 40000 : 0);
                      mapY = 225 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2831) * 35000 : 0);
                    } else if (b.zone === 'kesses-centre') {
                      mapX = 390 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2912) * 25000 : 0);
                      mapY = 240 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2825) * 25000 : 0);
                    } else if (b.zone === 'stage') {
                      mapX = 520 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2932) * 25000 : 0);
                      mapY = 355 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2808) * 25000 : 0);
                    } else if (b.zone === 'soweto') {
                      mapX = 580 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2942) * 20000 : 0);
                      mapY = 95 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2848) * 20000 : 0);
                    } else if (b.zone === 'cheboiywo') {
                      mapX = 260 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2858) * 20000 : 0);
                      mapY = 75 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2865) * 20000 : 0);
                    } else if (b.zone === 'talai') {
                      mapX = 620 + (b.mapPin?.lng ? (b.mapPin.lng - 35.2965) * 20000 : 0);
                      mapY = 445 - (b.mapPin?.lat ? (b.mapPin.lat - 0.2768) * 20000 : 0);
                    }

                    // Clamp strictly within map bounds
                    mapX = Math.max(30, Math.min(760, mapX));
                    mapY = Math.max(30, Math.min(470, mapY));

                    return (
                      <g
                        key={b.id}
                        className="cursor-pointer transition-all"
                        onClick={() => setFocusedBizId(b.id)}
                      >
                        {isFocused && (
                          <circle
                            cx={mapX}
                            cy={mapY}
                            r="20"
                            fill="none"
                            stroke="#C2185B"
                            strokeWidth="2.5"
                            className="animate-ping"
                          />
                        )}
                        <circle
                          cx={mapX}
                          cy={mapY}
                          r={isFocused ? 14 : 10}
                          fill={
                            isFocused
                              ? '#C2185B'
                              : b.activeTier === 'FEATURED'
                              ? '#FFC53D'
                              : '#0B6E70'
                          }
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={mapX}
                          y={mapY + 3.5}
                          fill={
                            isFocused || b.activeTier !== 'FEATURED'
                              ? '#FFFFFF'
                              : '#001C3B'
                          }
                          fontSize={isFocused ? '9' : '8'}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {b.name.slice(0, 1)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-[#594045] pt-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-[#001C3B]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#001C3B]" />
                    <span>Campus Gate Anchor</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C2185B]" />
                    <span>Selected Business</span>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0B6E70]">
                  Click any pin to inspect route & call
                </span>
              </div>
            </div>
          </div>

          {/* Spotlight Card beside map on desktop */}
          <div className="lg:col-span-5 space-y-4">
            <SpotlightCard
              business={focusedBiz}
              totalCount={filteredBusinesses.length}
              currentIndex={filteredBusinesses.findIndex((b) => b.id === focusedBiz?.id)}
              onPrev={() => handleCycleTarget('prev')}
              onNext={() => handleCycleTarget('next')}
              currentCoords={currentCoords}
              selectedRangeMeters={selectedRangeMeters}
            />
          </div>
        </div>
      )}

      {/* VIEW MODE 3: CARDS DIRECTORY VIEW (Sorted by Proximity) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-[#001C3B]/20 pt-4">
          <div>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#001C3B] uppercase">
              {filterZone === 'all'
                ? `All ${filteredBusinesses.length} Verified Businesses (Ranked by Walking Distance)`
                : `${filteredBusinesses.length} Businesses in ${filterZone.replace('-', ' ').toUpperCase()}`}
            </h3>
            <p className="text-xs text-[#594045]">
              Measured from:{' '}
              <strong className="text-[#001C3B]">
                {userGpsCoords ? 'Your Current GPS Location' : selectedAnchor.name}
              </strong>
            </p>
          </div>

          <Link
            href={`/search?zone=${filterZone}`}
            className="text-xs font-bold text-[#9B0044] hover:underline flex items-center gap-0.5 shrink-0"
          >
            <span>Advanced search</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-white rounded-xl border border-[#001C3B] animate-pulse"
              />
            ))}
          </div>
        ) : filteredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBusinesses.map((biz) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                distanceLabel={
                  biz.distanceStr
                    ? `${biz.walkTimeStr} (${biz.distanceStr})`
                    : biz.walkTime
                }
                anchorCoordinates={currentCoords}
                showDirectionsButton={true}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#F0F3FF] p-8 rounded-xl border border-[#001C3B] text-center space-y-2">
            <Store className="w-8 h-8 text-[#8D6F75] mx-auto" />
            <h4 className="font-display font-bold text-base text-[#001C3B]">
              No businesses found matching current filters.
            </h4>
            <p className="text-xs text-[#594045]">
              Try resetting your category or selecting &quot;All Kesses&quot; to discover businesses across campus.
            </p>
          </div>
        )}
      </div>

      {/* TRUST PROOF BANNER */}
      <div className="bg-[#FFF8E1] border-2 border-[#001C3B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#795900] shrink-0" />
          <div>
            <div className="font-display font-bold text-sm text-[#261900] uppercase">
              100% Real Campus Data · Zero Dummy Listings
            </div>
            <div className="text-xs text-[#6F5100]">
              All campus merchants have verified physical locations tagged with GPS & landmarks by Moi University student ambassadors.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center px-3 py-1 bg-white rounded border border-[#001C3B]">
            <div className="font-display font-black text-sm text-[#001C3B]">
              {businesses.length}
            </div>
            <div className="text-[10px] text-[#594045]">Verified Shops</div>
          </div>
          <div className="text-center px-3 py-1 bg-white rounded border border-[#001C3B]">
            <div className="font-display font-black text-sm text-[#001C3B]">
              {CAMPUS_ANCHORS.length}
            </div>
            <div className="text-[10px] text-[#594045]">Campus Anchors</div>
          </div>
          <div className="text-center px-3 py-1 bg-white rounded border border-[#001C3B]">
            <div className="font-display font-black text-sm text-[#001C3B]">
              &lt; 15 min
            </div>
            <div className="text-[10px] text-[#594045]">Walking Range</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CampusRadarDiscovery(props: CampusRadarDiscoveryProps) {
  return (
    <Suspense
      fallback={
        <div className="h-96 bg-white rounded-2xl border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] animate-pulse flex items-center justify-center">
          <div className="text-xs font-display font-bold text-[#001C3B] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#9B0044] animate-spin" />
            <span>INITIALIZING CAMPUS RADAR & NAVIGATION INSTRUMENT...</span>
          </div>
        </div>
      }
    >
      <CampusRadarDiscoveryInner {...props} />
    </Suspense>
  );
}
