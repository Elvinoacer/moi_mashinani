import type { MetadataRoute } from 'next';
import { Store } from '@/lib/store';
import { CATEGORIES, SEED_BUSINESSES } from '@/lib/constants';
import { CATEGORY_GROUPS } from '@/lib/categories';
import { SITE_URL } from '@/lib/seo';
import type { Business } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Load all businesses safely (merging database and verified seed directory listings)
  const businessMap = new Map<string, Business>();
  for (const b of SEED_BUSINESSES) {
    if (b.status === 'ACTIVE') businessMap.set(b.slug, b);
  }

  try {
    const list = await Store.getBusinesses();
    for (const b of list) {
      if (b.status === 'ACTIVE') businessMap.set(b.slug, b);
    }
  } catch {
    // Database unreachable during static builds: seed businesses retained
  }

  const businesses = Array.from(businessMap.values());

  // 1. Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      images: [`${SITE_URL}/brand/og-image.png`],
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/deals`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/onboard`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // 2. Category group directory landing pages
  const groupPages: MetadataRoute.Sitemap = CATEGORY_GROUPS.map((group) => ({
    url: `${SITE_URL}/c/${group.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.88,
  }));

  // 3. All leaf category directory pages
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/c/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // 4. All individual active campus business profiles with image sitemaps
  const businessPages: MetadataRoute.Sitemap = businesses.map((biz) => {
    let bizDate = now;
    if (biz.updatedAt) {
      const parsed = new Date(biz.updatedAt);
      if (!isNaN(parsed.getTime())) bizDate = parsed;
    } else if (biz.createdAt) {
      const parsed = new Date(biz.createdAt);
      if (!isNaN(parsed.getTime())) bizDate = parsed;
    }

    const rawPhotos = Array.from(new Set([biz.coverPhoto, ...(biz.photos || [])].filter(Boolean)));
    const photoUrls = rawPhotos
      .map((p) => (p.startsWith('http') ? p : `${SITE_URL}${p}`))
      .slice(0, 6);

    return {
      url: `${SITE_URL}/b/${biz.slug}`,
      lastModified: bizDate,
      changeFrequency: 'weekly',
      priority: biz.activeTier === 'FEATURED' ? 0.9 : biz.activeTier === 'RECOMMENDED' ? 0.85 : 0.8,
      ...(photoUrls.length > 0 ? { images: photoUrls } : {}),
    };
  });

  return [...staticPages, ...groupPages, ...categoryPages, ...businessPages];
}

