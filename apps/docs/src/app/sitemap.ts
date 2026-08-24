import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';
import { SITE_ORIGIN } from '@/lib/site-config';

/**
 * Sitemap, derived — never enumerated by hand.
 *
 * Every docs page comes from the same fumadocs `source` that renders it, so a
 * new plugin or rule is in the sitemap the moment its page exists (the same
 * "adding a plugin is just data" contract docs-seal.test.ts enforces). Only
 * the handful of non-docs surfaces are listed explicitly.
 *
 * This file exists because the site had NO sitemap at all — for a property
 * whose acquisition is almost entirely organic search landing on deep rule
 * pages, discovery depended on crawlers finding 478 pages by link-walking.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/plugins',
    '/articles',
    '/stats',
    '/scorecard',
    '/changelog',
  ].map((path) => ({
    url: `${SITE_ORIGIN}${path || '/'}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }));

  const docsRoutes: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${SITE_ORIGIN}${page.url}`,
    // Rule pages are the search landing surface — they carry the weight.
    priority: page.url.includes('/rules/') ? 0.8 : 0.7,
    changeFrequency: 'weekly',
  }));

  return [...staticRoutes, ...docsRoutes];
}
