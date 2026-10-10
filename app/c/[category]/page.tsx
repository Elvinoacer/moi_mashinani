import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CATEGORIES, SEED_BUSINESSES } from '@/lib/constants';
import { CATEGORY_GROUPS, categoryMatches } from '@/lib/categories';
import { Store } from '@/lib/store';
import {
  CATEGORY_ALIASES,
  getCategorySeoData,
  generateBreadcrumbSchema,
  generateCategoryItemListSchema,
  safeJsonLd,
} from '@/lib/seo';
import type { Business, Category } from '@/lib/types';
import { CategoryPageClient } from './CategoryPageClient';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

async function fetchCategoryBusinesses(categorySlug: string): Promise<Business[]> {
  try {
    const all = await Store.getBusinesses();
    return all.filter(
      (b) =>
        b.status === 'ACTIVE' &&
        categoryMatches(b, categorySlug)
    );
  } catch {
    return SEED_BUSINESSES.filter(
      (b) =>
        b.status === 'ACTIVE' &&
        categoryMatches(b, categorySlug)
    );
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: rawCategorySlug } = await params;
  const categorySlug = CATEGORY_ALIASES[rawCategorySlug] || rawCategorySlug;

  const leafCategory = CATEGORIES.find((c) => c.slug === categorySlug);
  const groupCategory = CATEGORY_GROUPS.find((g) => g.slug === categorySlug);

  if (!leafCategory && !groupCategory) {
    return {
      title: 'Category Not Found | MoiMashinani',
      description: 'Campus category not found on MoiMashinani.',
      robots: { index: false, follow: true },
    };
  }

  const seo = getCategorySeoData(categorySlug);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: `/c/${categorySlug}`,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/c/${categorySlug}`,
      siteName: 'MoiMashinani',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: rawCategorySlug } = await params;

  // Handle aliases (e.g. hostels-rentals -> hostels-rooms) with 301 redirect
  if (CATEGORY_ALIASES[rawCategorySlug]) {
    redirect(`/c/${CATEGORY_ALIASES[rawCategorySlug]}`);
  }

  const categorySlug = rawCategorySlug;
  const leafCategory = CATEGORIES.find((c) => c.slug === categorySlug);
  const groupCategory = CATEGORY_GROUPS.find((g) => g.slug === categorySlug);

  if (!leafCategory && !groupCategory) {
    return notFound();
  }

  const categoryObj: Category = leafCategory || {
    id: groupCategory!.slug,
    slug: groupCategory!.slug,
    name: groupCategory!.name,
    icon: groupCategory!.icon,
    description: `All ${groupCategory!.name.toLowerCase()} around Moi University Main Campus (Kesses).`,
    color: '#183e35',
    group: groupCategory!.slug,
  };

  const businesses = await fetchCategoryBusinesses(categorySlug);

  // If group, related are the leaf categories inside that group
  // If leaf, related are peer categories in the same group
  const relatedCategories = leafCategory
    ? CATEGORIES.filter((c) => c.group === categoryObj.group && c.slug !== categorySlug).slice(0, 6)
    : CATEGORIES.filter((c) => c.group === groupCategory!.slug).slice(0, 8);

  const seo = getCategorySeoData(categorySlug);

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ];

  if (leafCategory && seo.groupName && seo.groupName !== 'Campus Services') {
    const parentGroup = CATEGORY_GROUPS.find((g) => g.slug === leafCategory.group);
    if (parentGroup) {
      breadcrumbItems.push({ name: parentGroup.name, url: `/c/${parentGroup.slug}` });
    }
  }

  breadcrumbItems.push({ name: categoryObj.name, url: `/c/${categorySlug}` });

  const breadcrumbsSchema = generateBreadcrumbSchema(breadcrumbItems);
  const itemListSchema = generateCategoryItemListSchema(categorySlug, businesses);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }}
      />
      <CategoryPageClient
        categorySlug={categorySlug}
        categoryObj={categoryObj}
        initialBusinesses={businesses}
        relatedCategories={relatedCategories}
        popularSearches={seo.synonyms.slice(0, 8)}
      />
    </>
  );
}

