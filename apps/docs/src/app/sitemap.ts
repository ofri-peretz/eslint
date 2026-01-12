import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://interlace-eslint.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = source.getPages();

  const docsPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}/docs/${page.slugs.join('/')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: page.slugs.length === 0 ? 1.0 : 0.8,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // AI Crawling Entry Points
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ai.txt`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  return [...staticPages, ...docsPages];
}
