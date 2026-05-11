import { ArticlesClient } from '@/components/ArticlesClient';
import type { CachedArticlesData } from '@/lib/articles.types';
import {
  computeTagCounts,
  filterAndSortArticles,
  getFeaturedArticle,
  hasActiveFilters,
  paginateArticles,
  parseArticleParams,
} from '@/lib/articles.filter';
import type { Metadata } from 'next';

import articlesData from '@/data/articles.json';

export const metadata: Metadata = {
  title: 'Technical Articles',
  description:
    'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering by the Interlace team.',
  openGraph: {
    title: 'Technical Articles | ESLint Interlace',
    description:
      'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering.',
    type: 'website',
  },
};

/**
 * Articles index — Server Component.
 *
 * Reads search params on the server, slices the corpus once, and hands
 * the resolved view to the client. The URL is the storage layer; the
 * client only writes URL updates back.
 *
 * See:
 *   - PAGINATION_PHILOSOPHY.md (URLs are the storage layer)
 *   - URL_PHILOSOPHY.md        (shared `q`/`tag`/`sort`/`dir`/`page` vocabulary)
 *   - LOADING_PHILOSOPHY.md    (zero-CLS on slice swap; reserved layout)
 */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseArticleParams(raw);

  const { articles, lastUpdated } = articlesData as CachedArticlesData;

  const filtered = filterAndSortArticles(articles, params);
  const featured = getFeaturedArticle(articles, filtered, params);
  const { items, totalPages, total } = paginateArticles(
    filtered,
    featured,
    params.page,
  );
  const tagCounts = computeTagCounts(articles);

  // fumadocs `HomeLayout` already provides the page-level `<main>` landmark.
  // `id="main-content"` + `tabIndex={-1}` is the focusable target for the
  // root layout's skip link (KEYBOARD_PHILOSOPHY.md #1) so keyboard users
  // can bypass fumadocs's nav and land directly on the articles list.
  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="container max-w-6xl mx-auto px-4 py-8 outline-hidden"
    >
      <ArticlesClient
        totalArticles={articles.length}
        params={params}
        items={items}
        featured={featured}
        tagCounts={tagCounts}
        totalPages={totalPages}
        totalFiltered={total + (featured ? 1 : 0)}
        hasFilters={hasActiveFilters(params)}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}
