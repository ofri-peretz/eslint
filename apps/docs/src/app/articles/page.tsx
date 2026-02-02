// SSR-CACHE-BUST: 2026-02-01T18:38 - Force full page rebuild
import { ArticlesClient } from '@/components/ArticlesClient';
import type { CachedArticlesData } from '@/lib/articles.types';
import type { Metadata } from 'next';

// Import the cached articles data directly
import articlesData from '@/data/articles.json';

// Force dynamic rendering to avoid SSG prerender error with fumadocs FrameworkProvider
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Technical Articles',
  description: 'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering by the Interlace team.',
  openGraph: {
    title: 'Technical Articles | ESLint Interlace',
    description: 'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering.',
    type: 'website',
  },
};

export default function ArticlesPage() {
  const { articles, lastUpdated } = articlesData as CachedArticlesData;
  
  return (
    <main className="container max-w-6xl mx-auto px-4 py-8">
      <ArticlesClient articles={articles} lastUpdated={lastUpdated} />
    </main>
  );
}
