import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from '@/lib/seo';
import { SearchContent } from './SearchContent';

export const metadata: Metadata = {
  title: 'Search Campus Businesses, Services & Fundis | Moi University (Kesses)',
  description:
    'Search and filter verified businesses, food spots, hostels, phone repairs, kinyozi salons, and fundis around Moi University Main Campus (Kesses). Filter by campus zone and open-now status.',
  keywords: [
    'search Moi University businesses',
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
    title: 'Search Campus Businesses & Services | Moi University (Kesses)',
    description:
      'Search and filter verified businesses, food spots, hostels, and fundis around Moi University Main Campus (Kesses).',
    url: '/search',
    siteName: 'MoiMashinani',
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
      <Suspense fallback={<div className="p-8 text-center text-[#243b32]">Loading campus directory...</div>}>
        <SearchContent />
      </Suspense>
    </>
  );
}
