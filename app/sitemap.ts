import { publicListing } from "@/lib/campus-value";
import type { MetadataRoute } from "next";
import { Store } from "@/lib/store";
import { CATEGORIES, SEED_BUSINESSES } from "@/lib/constants";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { SITE_URL } from "@/lib/seo";
import type { Business } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Load all businesses safely (merging database and verified seed directory listings)
  const businessMap = new Map<string, Business>();
  for (const b of SEED_BUSINESSES) {
    if (publicListing(b, now.getTime())) businessMap.set(b.slug, b);
  }

  try {
    const list = await Store.getBusinesses();
    for (const b of list) {
      if (publicListing(b, now.getTime())) businessMap.set(b.slug, b);
      else businessMap.delete(b.slug);
    }
  } catch {
    // Database unreachable during static builds: seed businesses retained
  }

  const businesses = Array.from(businessMap.values());

  // 1. Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/housing`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/market`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/requests`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1.0,
      images: [`${SITE_URL}/brand/og-image.png`],
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${SITE_URL}/categories`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/deals`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/onboard`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // 2. Category group directory landing pages
  const groupPages: MetadataRoute.Sitemap = CATEGORY_GROUPS.map((group) => ({
    url: `${SITE_URL}/c/${group.slug}`,
    changeFrequency: "weekly",
    priority: 0.88,
  }));

  // 3. All leaf category directory pages
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/c/${cat.slug}`,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // 4. All individual active campus business profiles with image sitemaps
  const businessPages: MetadataRoute.Sitemap = businesses.map((biz) => {
    let bizDate: Date | undefined;
    if (biz.updatedAt) {
      const parsed = new Date(biz.updatedAt);
      if (!isNaN(parsed.getTime())) bizDate = parsed;
    } else if (biz.createdAt) {
      const parsed = new Date(biz.createdAt);
      if (!isNaN(parsed.getTime())) bizDate = parsed;
    }

    const rawPhotos = Array.from(
      new Set([biz.coverPhoto, ...(biz.photos || [])].filter(Boolean)),
    );
    const photoUrls = rawPhotos
      .map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`))
      .slice(0, 6);

    return {
      url: `${SITE_URL}/b/${biz.slug}`,
      ...(bizDate ? { lastModified: bizDate } : {}),
      changeFrequency: "weekly",
      priority:
        biz.activeTier === "FEATURED"
          ? 0.9
          : biz.activeTier === "RECOMMENDED"
            ? 0.85
            : 0.8,
      ...(photoUrls.length > 0 ? { images: photoUrls } : {}),
    };
  });

  return [...staticPages, ...groupPages, ...categoryPages, ...businessPages];
}
