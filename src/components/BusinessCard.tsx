'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Clock3, MapPin, MessageCircle, Navigation2, Phone, ShieldAlert, Sparkles, Store, Tag } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { ReportModal } from './ReportModal';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { buildGoogleMapsUrl } from '@/lib/geo';
import { useNow } from '@/lib/useNow';
import { trackBusinessEvent } from '@/lib/track-business-event';
import type { Business, Tier } from '@/lib/types';
import styles from './BusinessCard.module.css';

interface BusinessCardProps {
  business: Business;
  effectiveTier?: Tier;
  distanceLabel?: string;
  anchorCoordinates?: { lat: number; lng: number };
  showDirectionsButton?: boolean;
  onCallClick?: () => void;
  onWhatsAppClick?: () => void;
}

function getImageSource(source?: string) {
  if (!source) return '';
  if (source.startsWith('/') && !source.startsWith('//')) return source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

/** One card, shared across search, categories, suggestions and student deals. */
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
  const [imageFailed, setImageFailed] = useState(false);
  const now = useNow();

  const tier = effectiveTier ?? (business.tierEndsAt && new Date(business.tierEndsAt).getTime() <= now ? 'NONE' : business.activeTier);
  const promoted = tier === 'FEATURED' || tier === 'RECOMMENDED';
  const available = !business.isTemporarilyClosed && Boolean(
    business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now
  );
  const category = CATEGORIES.find((item) => item.slug === business.primaryCategory);
  const zone = ZONES.find((item) => item.slug === business.zone);
  const categoryName = category?.name || 'Local business';
  const zoneName = zone?.name || business.zone.replaceAll('-', ' ');
  const categoryIndex = Math.max(0, CATEGORIES.findIndex((item) => item.slug === business.primaryCategory));
  const tone = categoryIndex % 5;
  const photo = getImageSource(business.coverPhoto || business.photos?.[0]);
  const services = business.services || [];
  const firstService = services.find((service) => service.name.trim()) || services[0];
  const prices = services
    .map((service) => service.priceFrom)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price >= 0);
  const lowestPrice = prices.length ? Math.min(...prices) : undefined;
  const displayService = services.find((service) => lowestPrice !== undefined && service.priceFrom === lowestPrice) || firstService;
  const distance = distanceLabel || business.walkTime || 'Near campus';

  const recipient = (business.whatsapp || business.phone || '').replace(/\D/g, '');
  const whatsappPhone = recipient.startsWith('0') ? '254' + recipient.slice(1) : recipient;
  const whatsappMessage = encodeURIComponent(
    'Habari ' + business.name + ', nimeona profile yako kwa MoiMashinani campus directory. Naomba kuuliza kuhusu huduma zenu.'
  );
  const whatsappUrl = 'https://wa.me/' + whatsappPhone + '?text=' + whatsappMessage;

  function record(type: 'call' | 'whatsapp' | 'directions') {
    trackBusinessEvent(business.id, type);
  }

  function handleCall() {
    record('call');
    onCallClick?.();
  }

  function handleWhatsApp() {
    record('whatsapp');
    onWhatsAppClick?.();
  }

  function handleDirections(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    record('directions');
    const url = buildGoogleMapsUrl({
      destCoords: business.mapPin,
      originCoords: anchorCoordinates,
      businessName: business.name,
      landmark: business.landmark,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <article className={styles.card} data-tone={tone} data-tier={tier}>
        <Link href={'/b/' + business.slug} className={styles.media} aria-label={'View ' + business.name + ' profile'}>
          {photo && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={`${business.name} — ${categoryName} in ${zoneName}, Moi University Kesses`}
              loading="lazy"
              className={styles.cover}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className={styles.fallback} aria-hidden="true">
              <span className={styles.fallbackOrbit} />
              <span className={styles.fallbackMark}><Store size={42} strokeWidth={1.4} /></span>
              <span className={styles.fallbackCaption}>GOOD THINGS, NEARBY.</span>
            </div>
          )}
          <span className={styles.mediaShade} aria-hidden="true" />
          <span className={styles.mediaCategory}>{categoryName}</span>
          <span className={styles.mediaArrow} aria-hidden="true"><ArrowUpRight size={21} strokeWidth={1.8} /></span>
          {promoted && (
            <span className={styles.promoted}>
              <Sparkles size={13} aria-hidden="true" />
              {tier === 'FEATURED' ? 'Featured' : 'Recommended'}
              <span className={styles.screenReaderOnly}>Promoted listing</span>
            </span>
          )}
        </Link>

        <div className={styles.body}>
          <div className={styles.topline}>
            <span className={styles.place}><MapPin size={14} aria-hidden="true" /> {zoneName}</span>
            {business.verificationLevel === 'L2' && (
              <span className={styles.verified} title="Physically verified by the MoiMashinani team">
                <BadgeCheck size={16} aria-hidden="true" /> Verified
              </span>
            )}
          </div>

          <Link href={'/b/' + business.slug} className={styles.titleLink}>
            <h3 className={styles.title}>{business.name}</h3>
          </Link>
          <p className={styles.description}>
            {business.tagline?.trim() || business.description?.trim() || 'Get in touch with this local business.'}
          </p>

          <div className={styles.detailRow}>
            <span className={styles.distance}><Clock3 size={15} aria-hidden="true" /> {distance}</span>
            {available && <span className={styles.available}><span className={styles.liveDot} /> Available now</span>}
            {business.isTemporarilyClosed && <span className={styles.closed}>Temporarily closed</span>}
          </div>

          {displayService && (
            <div className={styles.serviceRow}>
              <div className={styles.serviceCopy}>
                <span className={styles.serviceEyebrow}>A LITTLE OF WHAT THEY DO</span>
                <span className={styles.serviceName}>{displayService.name}</span>
              </div>
              <div className={styles.servicePrice}>
                {lowestPrice === undefined ? (
                  <span className={styles.explorePrice}>See services</span>
                ) : (
                  <><span className={styles.from}>From</span><strong>KSh {lowestPrice.toLocaleString('en-KE')}</strong></>
                )}
              </div>
            </div>
          )}

          {business.studentDiscount?.trim() && (
            <div className={styles.discount}><Tag size={14} aria-hidden="true" /><span>{business.studentDiscount}</span></div>
          )}

          <button type="button" disabled={Boolean(business.isTemporarilyClosed) || business.status !== 'ACTIVE'} onClick={()=>setBookingOpen(true)} className={styles.booking} aria-label={`Request booking with ${business.name}`}>
            <Clock3 size={16} aria-hidden="true" /> {business.isTemporarilyClosed ? 'Bookings paused' : 'Request booking'}
          </button>
          <p className={styles.bookingNote}>{business.isTemporarilyClosed ? 'This business is temporarily closed.' : 'No account needed · owner confirms availability'}</p>
          <div className={styles.actions}>
            <a href={'tel:' + business.phone} onClick={handleCall} className={styles.call} aria-label={'Call ' + business.name}>
              <Phone size={16} aria-hidden="true" /> <span>Call shop</span>
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={handleWhatsApp}
              className={styles.whatsapp} aria-label={'WhatsApp ' + business.name}>
              <MessageCircle size={17} aria-hidden="true" /> <span>WhatsApp</span> <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.secondaryActions}>
            <div className={styles.secondaryMain}>
              {showDirectionsButton && (
                <button type="button" onClick={handleDirections} className={styles.utility}>
                  <Navigation2 size={15} aria-hidden="true" /> Directions
                </button>
              )}
              <Link href={'/b/' + business.slug} className={styles.utility}>
                View profile <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <button type="button" onClick={() => setReportOpen(true)} title="Report an issue with this listing"
              aria-label={'Report a problem with ' + business.name} className={styles.report}>
              <ShieldAlert size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      {bookingOpen && <BookingModal business={business} onClose={() => setBookingOpen(false)} />}
      {reportOpen && <ReportModal business={business} onClose={() => setReportOpen(false)} />}
    </>
  );
}
