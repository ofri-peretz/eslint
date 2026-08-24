import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/lib/site-config';

/**
 * robots.txt — allow everything, point at the sitemap.
 *
 * `/ingest/` is the PostHog reverse proxy: crawling it wastes crawl budget and
 * can generate junk ingest traffic, so it is the one exclusion. AI crawlers are
 * deliberately NOT blocked — `llms.txt` exists because AI assistants are a
 * first-class acquisition channel here (see the ai_docs:fetch middleware).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/ingest/'] }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
