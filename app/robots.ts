import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/c/', '/b/', '/categories', '/deals', '/search', '/onboard', '/brand/'],
        disallow: ['/admin/', '/dashboard/', '/api/', '/pro/', '/verify/', '/login/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
