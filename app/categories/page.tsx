import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories';
import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'All Business Categories & Campus Services | Moi University (Kesses)',
  description:
    'Explore 65 categories of businesses and services around Moi University Main Campus (Kesses): food, kibandas, hostels, bedsitters, phone repairs, kinyozi salons, printing, and fundis.',
  keywords: [
    'campus categories',
    'Moi University directory',
    'student services Kesses',
    'business categories Moi',
    'shops in Kesses',
    ...CORE_CAMPUS_KEYWORDS.slice(0, 15),
  ],
  alternates: {
    canonical: '/categories',
  },
  openGraph: {
    title: 'All Business Categories & Campus Services | Moi University (Kesses)',
    description:
      'Explore 65 categories of businesses and student services around Moi University Main Campus (Kesses).',
    url: '/categories',
    siteName: 'MoiMashinani',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Business Categories & Campus Services | Moi University',
    description: 'Find any campus service or shop around Moi University Main Campus in Kesses.',
  },
};

export default function CategoriesPage() {
  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ]);

  const categoryGroupsSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Moi University Campus Directory Categories',
    description: 'All 12 category groups and 65 categories covering local campus businesses and fundis in Kesses.',
    numberOfItems: CATEGORY_GROUPS.length + CATEGORIES.length,
    itemListElement: [
      ...CATEGORY_GROUPS.map((group, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: group.name,
        url: `${SITE_URL}/c/${group.slug}`,
      })),
      ...CATEGORIES.map((cat, index) => ({
        '@type': 'ListItem',
        position: CATEGORY_GROUPS.length + index + 1,
        name: cat.name,
        url: `${SITE_URL}/c/${cat.slug}`,
      })),
    ],
  };

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(categoryGroupsSchema) }}
      />
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-[#667064] uppercase">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span className="text-[#243b32]">Categories</span>
        </nav>

        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-[#243b32] uppercase tracking-tight">
            What do you need around campus?
          </h1>
          <p className="mt-2 text-[#667064] max-w-2xl text-sm md:text-base">
            Explore {CATEGORIES.length} business types in {CATEGORY_GROUPS.length} groups across Moi University (Kesses), from daily student essentials to specialist fundis.
          </p>
        </div>

        <CategoryBrowser />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
