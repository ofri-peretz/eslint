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
import { Container } from '@interlace/ui/container';
import type { Metadata } from 'next';

import articlesData from '@/data/articles.json';

export const metadata: Metadata = {
  title: 'Technical Articles',
  description:
    'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering by the Interlace team.',
  // Canonical pinned per SEO_PHILOSOPHY §1 — the page is URL-state-driven
  // (q, tag, page params), so search engines must index the bare /articles
  // form rather than the cartesian product of facets (PAGINATION_PHILOSOPHY).
  alternates: { canonical: '/articles' },
  openGraph: {
    title: 'Technical Articles | ESLint Interlace',
    description:
      'Deep dives into ESLint internals, security patterns, and high-performance JavaScript engineering.',
    type: 'website',
    url: '/articles',
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

  // Cast via `unknown` — see api/search/route.ts for the type-vs-cache
  // divergence rationale. Aligning DevToArticle with the cached shape is
  // tracked as a follow-up.
  const { articles, lastUpdated } = articlesData as unknown as CachedArticlesData;

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
  //
  // <Container size="wide"> owns the max-width + horizontal padding
  // (LAYOUT_PHILOSOPHY.md §2): articles is a card-grid surface and `wide`
  // (1280px) is the contract width. The previous `max-w-6xl` (1152px) was
  // ad-hoc and forbidden by the layout philosophy lock.
  return (
    <Container
      size="wide"
      id="main-content"
      tabIndex={-1}
      className="py-8 outline-hidden"
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
    </Container>
  );
}
