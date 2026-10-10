import type { Metadata } from 'next';
import { Store } from '@/lib/store';
import { SEED_BUSINESSES } from '@/lib/constants';
import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from '@/lib/seo';
import type { Business } from '@/lib/types';
import { DealsPageClient } from './DealsPageClient';

export const metadata: Metadata = {
  title: 'Student Deals, Discounts & Campus Trust Guide | Moi University (Kesses)',
  description:
    'Exclusive Moi University student discounts in Kesses: save money on food, phone repairs, haircuts, printing and campus essentials with our safety guide.',
  keywords: [
    'student discounts Moi University',
    'campus deals Kesses',
    'cheap food Moi University',
    'student offers Eldoret',
    'Moi University discounts',
    'cheap kinyozi Kesses',
    ...CORE_CAMPUS_KEYWORDS.slice(0, 15),
  ],
  alternates: {
    canonical: '/deals',
  },
  openGraph: {
    title: 'Student Deals, Discounts & Campus Trust Guide | Moi University (Kesses)',
    description:
      'Exclusive Moi University student discounts in Kesses. Save money on food, phone repairs, haircuts, printing and campus essentials.',
    url: '/deals',
    siteName: 'MoiMashinani',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student Deals & Discounts | Moi University (Kesses)',
    description: 'Find active student discounts and budget offers around campus.',
  },
};

async function fetchDeals(): Promise<Business[]> {
  try {
    const all = await Store.getBusinesses();
    return all.filter((b) => Boolean(b.studentDiscount) && b.status === 'ACTIVE');
  } catch {
    return SEED_BUSINESSES.filter((b) => Boolean(b.studentDiscount) && b.status === 'ACTIVE');
  }
}

export default async function DealsAndSafetyPage() {
  const deals = await fetchDeals();

  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Student Deals', url: '/deals' },
  ]);

  const dealsItemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Active Moi University Student Discounts & Offers',
    description: 'Verified student discounts in Kesses across food, electronics repair, haircuts, and supplies.',
    numberOfItems: deals.length,
    itemListElement: deals.map((biz, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${biz.name} — ${biz.studentDiscount}`,
      url: `${SITE_URL}/b/${biz.slug}`,
      description: biz.studentDiscount,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(dealsItemListSchema) }}
      />
      <DealsPageClient initialDeals={deals} />
    </>
  );
}
