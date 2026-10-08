'use client';

import { useState } from 'react';
import Form from 'next/form';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BadgeCheck, ChevronDown, MapPin, Search, Store } from 'lucide-react';
import type { Business, ServiceItem } from '@/lib/types';
import styles from './discovery.module.css';

export type LandingBusiness = Pick<
  Business,
  | 'id'
  | 'name'
  | 'slug'
  | 'tagline'
  | 'primaryCategory'
  | 'zone'
  | 'coverPhoto'
  | 'verificationLevel'
  | 'services'
  | 'studentDiscount'
  | 'serviceModes'
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
  { id: 'all', label: 'All finds', categories: [] as string[], browseCategory: '', browseLabel: 'all businesses' },
  { id: 'food', label: 'Food & drinks', categories: ['food-cafes', 'cakes-bakes'], browseCategory: 'food-cafes', browseLabel: 'food & cafes' },
  { id: 'beauty', label: 'Beauty & care', categories: ['hair-beauty-kinyozi'], browseCategory: 'hair-beauty-kinyozi', browseLabel: 'salons & kinyozi' },
  { id: 'tech', label: 'Tech & repair', categories: ['phone-laptop-repair', 'wifi-tech-gadgets'], browseCategory: 'phone-laptop-repair', browseLabel: 'phone & laptop repair' },
  { id: 'essentials', label: 'Everyday essentials', categories: ['printing-cyber', 'laundry-mama-fua', 'gas-groceries', 'tailoring-fashion'], browseCategory: 'gas-groceries', browseLabel: 'gas & groceries' },
] as const;

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
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = coverSource(business.coverPhoto);
  const firstService = business.services[0];
  const price = servicePrice(firstService);

  return (
    <Link href={`/b/${business.slug}`} className={styles.card}>
      <div className={styles.cardMedia}>
        {imageSource && !imageFailed ? (
          <Image
            src={imageSource}
            alt=""
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
        <span className={styles.categoryPill}>{business.categoryName}</span>
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
  );
}

export function LocalDiscoveries({ businesses }: { businesses: LandingBusiness[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['id']>('all');
  const selectedFilter = filters.find((filter) => filter.id === activeFilter) || filters[0];
  const visibleBusinesses = businesses
    .filter((business) => activeFilter === 'all' || (selectedFilter.categories as readonly string[]).includes(business.primaryCategory))
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
      <div className={styles.filters} role="group" aria-label="Filter local discoveries">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={`${styles.filterButton} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
            aria-pressed={activeFilter === filter.id}
            aria-controls="local-discoveries-results"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
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
