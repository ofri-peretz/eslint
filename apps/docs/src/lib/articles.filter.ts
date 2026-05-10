/**
 * Articles filter / sort / paginate logic.
 *
 * Pure functions, server-safe. Imported by both the server page
 * (`app/articles/page.tsx`) and the client component
 * (`components/ArticlesClient.tsx`) so the URL is the single source of
 * truth and the same code runs on both sides of the wire.
 *
 * Aligned with PAGINATION_PHILOSOPHY.md:
 * - Server reads `searchParams`, slices once, hands to client
 * - URL params are the storage layer
 * - Default-elision: params at their default are dropped from the URL
 */

import type { DevToArticle, SortField, SortDirection } from './articles.types';

export const ARTICLES_PER_PAGE = 12;

const SORT_FIELDS: readonly SortField[] = ['date', 'reactions', 'comments', 'reading_time'];
const SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

export interface ArticleParams {
  q: string;
  tags: string[];
  sort: SortField;
  dir: SortDirection;
  page: number;
}

export const DEFAULT_PARAMS: ArticleParams = {
  q: '',
  tags: [],
  sort: 'date',
  dir: 'desc',
  page: 1,
};

/** Coerce a raw searchParams entry to a single string value (Next.js
 *  serves `string | string[] | undefined`). */
function single(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function many(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.flatMap(part => part.split(',')).filter(Boolean);
  if (typeof v === 'string') return v.split(',').filter(Boolean);
  return [];
}

/** Parse a raw `searchParams` object (server-side or `URLSearchParams`-derived)
 *  into a typed, defaulted, validated `ArticleParams`. */
export function parseArticleParams(
  raw: Record<string, string | string[] | undefined> | URLSearchParams,
): ArticleParams {
  const get = (key: string) =>
    raw instanceof URLSearchParams ? raw.getAll(key) : raw[key];

  const q = (single(get('q')) ?? '').trim();
  const tags = many(get('tag'));
  const sortRaw = single(get('sort'));
  const dirRaw = single(get('dir'));
  const pageRaw = single(get('page'));

  const sort: SortField = (SORT_FIELDS as readonly string[]).includes(sortRaw ?? '')
    ? (sortRaw as SortField)
    : DEFAULT_PARAMS.sort;
  const dir: SortDirection = (SORT_DIRECTIONS as readonly string[]).includes(dirRaw ?? '')
    ? (dirRaw as SortDirection)
    : DEFAULT_PARAMS.dir;
  const pageNum = Number.parseInt(pageRaw ?? '', 10);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;

  return { q, tags, sort, dir, page };
}

/** Serialize params back to a `URLSearchParams` string with default elision
 *  — params at their default value are removed from the URL. */
export function serializeArticleParams(params: Partial<ArticleParams>): string {
  const sp = new URLSearchParams();
  const merged = { ...DEFAULT_PARAMS, ...params };
  if (merged.q) sp.set('q', merged.q);
  if (merged.tags.length > 0) sp.set('tag', merged.tags.join(','));
  if (merged.sort !== DEFAULT_PARAMS.sort) sp.set('sort', merged.sort);
  if (merged.dir !== DEFAULT_PARAMS.dir) sp.set('dir', merged.dir);
  if (merged.page !== DEFAULT_PARAMS.page) sp.set('page', String(merged.page));
  return sp.toString();
}

export function hasActiveFilters(params: ArticleParams): boolean {
  return params.q !== '' || params.tags.length > 0;
}

/** Apply text + tag filters and the requested sort. Pure. */
export function filterAndSortArticles(
  articles: DevToArticle[],
  params: ArticleParams,
): DevToArticle[] {
  const queryLower = params.q.toLowerCase();
  const filtered = articles.filter(article => {
    const matchesSearch =
      params.q === '' ||
      article.title.toLowerCase().includes(queryLower) ||
      article.description.toLowerCase().includes(queryLower);
    const matchesTags =
      params.tags.length === 0 ||
      params.tags.every(tag => article.tag_list.includes(tag));
    return matchesSearch && matchesTags;
  });

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    switch (params.sort) {
      case 'date':
        comparison = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        break;
      case 'reactions':
        comparison = b.positive_reactions_count - a.positive_reactions_count;
        break;
      case 'comments':
        comparison = b.comments_count - a.comments_count;
        break;
      case 'reading_time':
        comparison = b.reading_time_minutes - a.reading_time_minutes;
        break;
    }
    return params.dir === 'desc' ? comparison : -comparison;
  });

  return sorted;
}

/** Featured slot: always rendered on page 1 (PAGINATION_PHILOSOPHY).
 *  - No active filters → top by reactions across the corpus
 *  - Active filters → top of the current sort over filtered results */
export function getFeaturedArticle(
  articles: DevToArticle[],
  filtered: DevToArticle[],
  params: ArticleParams,
): DevToArticle | null {
  if (params.page !== 1) return null;
  if (hasActiveFilters(params)) return filtered[0] ?? null;
  return [...articles].sort(
    (a, b) => b.positive_reactions_count - a.positive_reactions_count,
  )[0] ?? null;
}

/** Slice a sorted+filtered list to the current page, excluding featured. */
export function paginateArticles(
  filtered: DevToArticle[],
  featured: DevToArticle | null,
  page: number,
): { items: DevToArticle[]; totalPages: number; total: number } {
  const grid = featured ? filtered.filter(a => a.id !== featured.id) : filtered;
  const totalPages = Math.max(1, Math.ceil(grid.length / ARTICLES_PER_PAGE));
  const startIndex = (page - 1) * ARTICLES_PER_PAGE;
  return {
    items: grid.slice(startIndex, startIndex + ARTICLES_PER_PAGE),
    totalPages,
    total: grid.length,
  };
}

/** Top-N tag counts across the full corpus. */
export function computeTagCounts(
  articles: DevToArticle[],
  topN = 15,
): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const article of articles) {
    for (const tag of article.tag_list) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/** Toggle a tag in the current params (returns new params, page reset to 1). */
export function toggleTagInParams(params: ArticleParams, tag: string): ArticleParams {
  const has = params.tags.includes(tag);
  const tags = has ? params.tags.filter(t => t !== tag) : [...params.tags, tag];
  return { ...params, tags, page: 1 };
}
