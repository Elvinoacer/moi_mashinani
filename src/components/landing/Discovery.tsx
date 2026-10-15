'use client';

import { useState } from 'react';
import Form from 'next/form';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BadgeCheck, ChevronDown, GraduationCap, MapPin, Search, Star, Store } from 'lucide-react';
import type { Business, ServiceItem } from '@/lib/types';
import styles from './discovery.module.css';
import { BookingModal } from '@/components/BookingModal';
import { CATEGORY_GROUPS, categoryMatches } from '@/lib/categories';
import { useNow } from '@/lib/useNow';

export type LandingBusiness = Pick<
  Business,
  | 'id'
  | 'name'
  | 'slug'
  | 'tagline'
  | 'primaryCategory'
  | 'extraCategories'
  | 'zone'
  | 'coverPhoto'
  | 'verificationLevel'
  | 'services'
  | 'studentDiscount'
  | 'serviceModes'
  | 'phone'
  | 'whatsapp'
  | 'status'
  | 'isTemporarilyClosed'
  | 'activeTier'
  | 'tierEndsAt'
> & { categoryName: string; zoneName: string };

const popularSearches = ['Printing', 'Phone repair', 'Braids', 'Gas refill'];

export function LandingSearch({ zones }: { zones: { slug: string; name: string }[] }) {
  return (
    <div className={styles.searchBlock}>
      <Form action="/search" role="search" className={styles.searchForm}>
        <div className={styles.queryField}>
          <Search size={21} strokeWidth={1.8} aria-hidden="true" />
          <label htmlFor="landing-query" className={styles.srOnly}>What are you looking for?</label>
          <input
            id="landing-query"
            name="q"
            type="search"
            placeholder="What are you looking for?"
            autoComplete="off"
          />
        </div>
        <div className={styles.zoneField}>
          <MapPin size={17} strokeWidth={1.8} aria-hidden="true" />
          <label htmlFor="landing-zone" className={styles.srOnly}>Choose your area</label>
          <select id="landing-zone" name="zone" defaultValue="all">
            <option value="all">All areas</option>
            {zones.filter((zone) => zone.slug !== 'all').map((zone) => (
              <option key={zone.slug} value={zone.slug}>{zone.name}</option>
            ))}
          </select>
          <ChevronDown className={styles.selectChevron} size={15} aria-hidden="true" />
        </div>
        <button className={styles.searchButton} type="submit">
          Find it <ArrowUpRight size={19} aria-hidden="true" />
        </button>
      </Form>
      <div className={styles.popularSearches} aria-label="Popular searches">
        <span>Try:</span>
        {popularSearches.map((query, index) => (
          <span className={styles.popularItem} key={query}>
            {index > 0 && <span className={styles.popularDot} aria-hidden="true">·</span>}
            <Link href={`/search?q=${encodeURIComponent(query)}`}>{query}</Link>
          </span>
        ))}
      </div>
    </div>
  );
}

const filters = [
  { id: 'all', label: 'All finds', browseCategory: '', browseLabel: 'all businesses' },
  ...CATEGORY_GROUPS.map(group => ({ id: group.slug, label: group.name, browseCategory: group.slug, browseLabel: group.name.toLowerCase() })),
];

function coverSource(source: string) {
  if (!source) return '';
  if (source.startsWith('/') && !source.startsWith('//')) return source;

  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', '640');
      url.searchParams.set('q', '75');
      url.searchParams.set('auto', 'format');
    }
    return url.toString();
  } catch {
    return '';
  }
}

function servicePrice(service: ServiceItem | undefined) {
  if (service?.priceFrom === undefined || !Number.isFinite(service.priceFrom)) return null;
  if (service.priceFrom === 0 && !service.priceTo) return 'Free';
  const start = service.priceFrom.toLocaleString('en-KE');
  if (service.priceTo !== undefined && service.priceTo > service.priceFrom) {
    return `KSh ${start}–${service.priceTo.toLocaleString('en-KE')}`;
  }
  return `From KSh ${start}`;
}

function DiscoveryCard({ business }: { business: LandingBusiness }) {
  const now = useNow();
  const [imageFailed, setImageFailed] = useState(false);
  const [bookingOpen,setBookingOpen] = useState(false);
  const imageSource = coverSource(business.coverPhoto);
  const firstService = business.services[0];
  const price = servicePrice(firstService);

  return (
    <>
    <article className={styles.card}>
    <Link href={`/b/${business.slug}`} className={styles.profileLink} aria-label={`View ${business.name} profile`}>
      <div className={styles.cardMedia}>
        {imageSource && !imageFailed ? (
          <Image
            src={imageSource}
            alt={`${business.name} — ${business.categoryName} in ${business.zoneName}, Moi University`}
            fill
            sizes="(max-width: 580px) calc(100vw - 40px), (max-width: 1000px) 45vw, 300px"
            unoptimized
            loading="lazy"
            className={styles.cardImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            <span className={styles.fallbackCircle} />
            <Store size={52} strokeWidth={1.15} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {business.activeTier === 'FEATURED' && (!business.tierEndsAt || new Date(business.tierEndsAt).getTime() > now) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ffc53d] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#243b32] shadow-sm">
              <Star size={12} aria-hidden="true" /> Featured
            </span>
          )}
          <span className={styles.categoryPill}>{business.categoryName}</span>
        </div>
        <span className={styles.cardArrow} aria-hidden="true"><ArrowUpRight size={19} /></span>
      </div>
      <div className={styles.cardContent}>
        <p className={styles.cardLocation}><MapPin size={13} aria-hidden="true" />{business.zoneName}</p>
        <h3 className={styles.cardTitle}>
          {business.name}
          {business.verificationLevel === 'L2' && (
            <span className={styles.verified} title="Business verified in person">
              <BadgeCheck size={18} aria-hidden="true" />
              <span className={styles.srOnly}>Verified in person</span>
            </span>
          )}
        </h3>
        <p className={styles.cardDescription}>{business.tagline || firstService?.name || business.categoryName}</p>
        <div className={styles.cardFooter}>
          <p className={styles.serviceName}>{firstService?.name || 'Explore this business'}</p>
          <div className={styles.priceRow}>
            <p className={styles.price}>
              {price || 'View services'}
              {price && firstService?.unit && <span> {firstService.unit}</span>}
            </p>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
    <div className={styles.bookingAction}>
      <button type="button" disabled={business.isTemporarilyClosed || business.status!=='ACTIVE'} onClick={()=>setBookingOpen(true)} aria-label={`Request booking with ${business.name}`}>
        {business.isTemporarilyClosed ? 'Bookings paused' : 'Request booking'} <ArrowUpRight size={16} aria-hidden="true" />
      </button>
      <p>{business.isTemporarilyClosed ? 'This business is temporarily closed.' : 'No account needed · owner confirms availability'}</p>
    </div>
    </article>
    {bookingOpen&&<BookingModal business={business} onClose={()=>setBookingOpen(false)}/>}
    </>
  );
}

export function LocalDiscoveries({ businesses }: { businesses: LandingBusiness[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['id']>('all');
  const selectedFilter = filters.find((filter) => filter.id === activeFilter) || filters[0];
  const visibleBusinesses = businesses
    .filter((business) => activeFilter === 'all' || categoryMatches(business, selectedFilter.browseCategory))
    .slice(0, 4);

  return (
    <section className={styles.discoveries} aria-labelledby="local-discoveries-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Good finds, close by</p>
          <h2 id="local-discoveries-heading">Your next local find.</h2>
        </div>
        <Link className={styles.browseLink} href="/search">Browse all <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
      <div className={styles.filters}>
        <label htmlFor="local-discovery-category" className={styles.srOnly}>Filter local discoveries</label>
        <select id="local-discovery-category" value={activeFilter} onChange={event => setActiveFilter(event.target.value)} aria-controls="local-discoveries-results" className="max-w-full rounded-xl border border-[#dfe5d8] bg-white px-4 py-3 text-sm font-semibold text-[#243b32] focus:outline-2 focus:outline-[#335e41]">
          {filters.map(filter => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
        </select>
      </div>
      <p className={styles.srOnly} role="status">
        {visibleBusinesses.length} {visibleBusinesses.length === 1 ? 'business' : 'businesses'} shown. {selectedFilter.label}.
      </p>
      <div id="local-discoveries-results">
        {visibleBusinesses.length > 0 ? (
          <div className={styles.cards} key={activeFilter}>
            {visibleBusinesses.map((business) => <DiscoveryCard key={business.id} business={business} />)}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Store size={32} strokeWidth={1.5} aria-hidden="true" />
            <h3>{businesses.length === 0 ? 'The next local find could be you.' : 'More local finds are on the way.'}</h3>
            <p>{businesses.length === 0 ? 'Add your business so people nearby can discover what you offer.' : 'Explore the full directory to find what you need.'}</p>
            <Link href={businesses.length === 0 ? '/onboard' : `/search?category=${selectedFilter.browseCategory}`}>
              {businesses.length === 0 ? 'Add your business' : `Browse ${selectedFilter.browseLabel}`} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function FeaturedSpotlight({ businesses }: { businesses: LandingBusiness[] }) {
  const now = useNow();
  const featured = businesses.filter(
    (b) => b.activeTier === 'FEATURED' && (!b.tierEndsAt || new Date(b.tierEndsAt).getTime() > now)
  );
  if (featured.length === 0) return null;

  return (
    <section className="mb-10 space-y-4" aria-labelledby="featured-spotlight-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4cc] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#9a6700] border border-[#ffe082]">
            <Star size={14} className="text-[#e69500]" aria-hidden="true" /> Campus Featured Spotlight
          </div>
          <h2 id="featured-spotlight-heading" className="mt-2 font-display text-2xl md:text-3xl font-black text-[#243b32] tracking-tight">
            Featured around campus
          </h2>
          <p className="text-sm text-[#667064]">
            Top campus services and student fundis with verified locations & fast contacts
          </p>
        </div>
        <Link href="/search" className="inline-flex items-center gap-1 text-xs font-bold text-[#335e41] hover:underline">
          View all verified listings →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featured.map((biz) => {
          const firstService = biz.services[0];
          const price = servicePrice(firstService);
          const imgSrc = coverSource(biz.coverPhoto);
          return (
            <article
              key={biz.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border-2 border-[#ffc53d] shadow-[0_8px_24px_rgba(255,197,61,0.18)] transition-all hover:shadow-[0_12px_32px_rgba(255,197,61,0.25)] hover:-translate-y-0.5"
            >
              <Link href={`/b/${biz.slug}`} className="block">
                <div className="relative h-44 w-full bg-[#f4f7f2] overflow-hidden">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={biz.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#758071]">
                      <Store size={44} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ffc53d] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#243b32] shadow-sm">
                      <Star size={12} aria-hidden="true" /> Featured
                    </span>
                    <span className="rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-[#243b32]">
                      {biz.categoryName}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-[#667064]">
                    <MapPin size={12} className="text-[#335e41]" />
                    <span>{biz.zoneName}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#243b32] group-hover:text-[#183e35] transition-colors flex items-center justify-between">
                    <span>{biz.name}</span>
                    <ArrowUpRight size={16} className="text-[#667064] group-hover:text-[#243b32] transition-colors" />
                  </h3>
                  <p className="line-clamp-2 text-xs text-[#4a584e] leading-relaxed">
                    {biz.tagline || firstService?.name || biz.categoryName}
                  </p>
                  {biz.studentDiscount && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-[#eff4da] px-2.5 py-1 text-[11px] font-bold text-[#526936]">
                      <GraduationCap size={14} className="shrink-0" aria-hidden="true" /> {biz.studentDiscount}
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4 pt-0 mt-auto border-t border-[#f0f4ec] flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#243b32]">
                  {price || 'Browse services'}
                </span>
                <div className="flex items-center gap-2">
                  {biz.whatsapp && (
                    <a
                      href={`https://wa.me/${biz.whatsapp.replace(/\D/g, '').replace(/^0/, '254')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#e8f7ee] text-[#128c7e] px-3 py-1.5 font-bold hover:bg-[#d0f0de] transition"
                    >
                      WhatsApp
                    </a>
                  )}
                  {biz.phone && (
                    <a
                      href={`tel:${biz.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#edf2e5] text-[#243b32] px-3 py-1.5 font-bold hover:bg-[#dfe5d8] transition"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

