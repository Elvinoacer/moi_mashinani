import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from '@/lib/seo';
import { SearchContent } from './SearchContent';
import { PublicPageLoading } from '@/components/PublicPageLoading';

export const metadata: Metadata = {
  title: 'Find Businesses Near Moi University, Kesses',
  description:
    'Search for businesses around Moi University Main Campus in Kesses. Find shops, food, hostels, phone repairs, salons and nearby services; filter by campus area.',
  keywords: [
    'search Moi University businesses',
    'businesses near Moi University',
    'businesses around Moi University',
    'shops near Moi University',
    'Moi University business directory',
    'find fundi Kesses',
    'campus services search',
    'Moi University directory search',
    'shops in Soweto Moi',
    'shops in Cheboiywo',
    'shops at Stage Moi',
    ...CORE_CAMPUS_KEYWORDS.slice(0, 15),
  ],
  alternates: {
    canonical: '/search',
  },
  openGraph: {
    title: 'Find Local Businesses Near Moi University, Kesses',
    description:
      'Discover businesses, shops, food, hostels and student services around Moi University Main Campus, Kesses.',
    url: '/search',
    siteName: 'Moi Mashinani',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Campus Businesses | Moi University (Kesses)',
    description: 'Find any campus service or shop around Moi University Main Campus in Kesses.',
  },
};

export default function SearchPage() {
  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Search Directory', url: '/search' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <Suspense fallback={<PublicPageLoading />}>
        <SearchContent />
      </Suspense>
    </>
  );
}
