import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Store } from '@/lib/store';
import { CATEGORIES, SEED_BUSINESSES } from '@/lib/constants';
import { categoryMatches } from '@/lib/categories';
import {
  getBusinessSeoData,
  generateBreadcrumbSchema,
  generateLocalBusinessSchema,
  safeJsonLd,
} from '@/lib/seo';
import type { Business } from '@/lib/types';
import { BusinessProfileClient } from './BusinessProfileClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchBusiness(slug: string): Promise<Business | undefined> {
  try {
    const business = await Store.getBusinessBySlug(slug);
    if (business) return business;
  } catch {
    // Database fallback
  }
  return SEED_BUSINESSES.find((b) => b.slug === slug);
}

async function fetchSimilarBusinesses(category: string, currentId: string): Promise<Business[]> {
  const catObj = CATEGORIES.find((c) => c.slug === category);
  const groupSlug = catObj?.group;

  let all: Business[] = [];
  try {
    all = await Store.getBusinesses();
  } catch {
    all = SEED_BUSINESSES;
  }

  const primaryMatches = all.filter(
    (b) =>
      b.status === 'ACTIVE' &&
      b.id !== currentId &&
      (b.primaryCategory === category || b.extraCategories.includes(category))
  );

  if (primaryMatches.length >= 3) {
    return primaryMatches.slice(0, 3);
  }

  // Backfill with other businesses from the same category group
  const groupMatches = groupSlug
    ? all.filter(
        (b) =>
          b.status === 'ACTIVE' &&
          b.id !== currentId &&
          !primaryMatches.some((pm) => pm.id === b.id) &&
          categoryMatches(b, groupSlug)
      )
    : [];

  return [...primaryMatches, ...groupMatches].slice(0, 3);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await fetchBusiness(slug);

  if (!business) {
    return {
      title: 'Business Not Found | MoiMashinani',
      description: 'Campus business profile not found on MoiMashinani.',
      robots: { index: false, follow: true },
    };
  }

  const { title, description, keywords, coverImage } = getBusinessSeoData(business);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/b/${business.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/b/${business.slug}`,
      siteName: 'MoiMashinani',
      type: 'profile',
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: `${business.name} storefront in ${business.zone}, Moi University`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImage],
    },
  };
}

export default async function BusinessProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const business = await fetchBusiness(slug);

  if (!business) {
    return notFound();
  }

  const similarBusinesses = await fetchSimilarBusinesses(business.primaryCategory, business.id);
  const categoryName = CATEGORIES.find((c) => c.slug === business.primaryCategory)?.name || business.primaryCategory.replace(/-/g, ' ');

  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: categoryName, url: `/c/${business.primaryCategory}` },
    { name: business.name, url: `/b/${business.slug}` },
  ]);

  const businessSchema = generateLocalBusinessSchema(business);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(businessSchema) }}
      />
      <BusinessProfileClient
        slug={slug}
        initialBusiness={business}
        initialSimilar={similarBusinesses}
      />
    </>
  );
}

