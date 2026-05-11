/**
 * Pure-logic tests for the articles filter library.
 *
 * The library is the foundation of `/articles` — both the Server
 * Component and the Client Component import from it. A drift between
 * the filter rules and reader expectations is the kind of bug that
 * shows up in production three weeks later. These tests fix the
 * contract.
 *
 * See PAGINATION_PHILOSOPHY.md and URL_PHILOSOPHY.md.
 */

import { describe, it, expect } from 'vitest';
import type { DevToArticle } from '@/lib/articles.types';
import {
  ARTICLES_PER_PAGE,
  DEFAULT_PARAMS,
  computeTagCounts,
  filterAndSortArticles,
  getFeaturedArticle,
  hasActiveFilters,
  paginateArticles,
  parseArticleParams,
  serializeArticleParams,
  toggleTagInParams,
  type ArticleParams,
} from '@/lib/articles.filter';

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────

const make = (overrides: Partial<DevToArticle> = {}): DevToArticle => ({
  id: Math.floor(Math.random() * 1_000_000),
  title: 'Sample title',
  description: 'Sample description',
  url: 'https://dev.to/sample',
  cover_image: null,
  published_at: '2026-01-15T10:00:00Z',
  reading_time_minutes: 5,
  positive_reactions_count: 10,
  comments_count: 2,
  page_views_count: 100,
  tag_list: [],
  user: { name: 'Author', username: 'author', profile_image: 'https://example.com/a.png' },
  ...overrides,
});

const sample = (): DevToArticle[] => [
  make({ id: 1, title: 'SQL Injection Guide', description: 'pg queries safely', tag_list: ['security', 'postgres'], positive_reactions_count: 50, comments_count: 10, reading_time_minutes: 8, published_at: '2026-01-20T10:00:00Z' }),
  make({ id: 2, title: 'JWT Security Best Practices', description: 'sign safely', tag_list: ['security', 'jwt'], positive_reactions_count: 30, comments_count: 5, reading_time_minutes: 6, published_at: '2026-01-18T10:00:00Z' }),
  make({ id: 3, title: 'ESLint Plugin Development', description: 'build a plugin', tag_list: ['javascript', 'eslint'], positive_reactions_count: 25, comments_count: 8, reading_time_minutes: 10, published_at: '2026-01-15T10:00:00Z' }),
  make({ id: 4, title: 'Node Performance Tips', description: 'optimize node', tag_list: ['node', 'performance'], positive_reactions_count: 20, comments_count: 3, reading_time_minutes: 4, published_at: '2026-01-10T10:00:00Z' }),
];

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

describe('ARTICLES_PER_PAGE', () => {
  it('is 12 (PAGINATION_PHILOSOPHY page-size guidance for the current corpus)', () => {
    expect(ARTICLES_PER_PAGE).toBe(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// parseArticleParams
// ─────────────────────────────────────────────────────────────────────────

describe('parseArticleParams', () => {
  it('returns defaults for an empty object', () => {
    expect(parseArticleParams({})).toEqual(DEFAULT_PARAMS);
  });

  it('reads q, tag, sort, dir, page when present and valid', () => {
    expect(parseArticleParams({
      q: 'jwt',
      tag: 'security',
      sort: 'reactions',
      dir: 'asc',
      page: '3',
    })).toEqual({
      q: 'jwt',
      tags: ['security'],
      sort: 'reactions',
      dir: 'asc',
      page: 3,
    });
  });

  it('trims whitespace from q', () => {
    expect(parseArticleParams({ q: '  jwt  ' }).q).toBe('jwt');
  });

  it('accepts repeated `tag` params (?tag=a&tag=b)', () => {
    // Repeated query params arrive as a string[] in Next.js.
    expect(parseArticleParams({ tag: ['security', 'jwt'] }).tags).toEqual([
      'security',
      'jwt',
    ]);
  });

  it('accepts comma-joined `tag` form (?tag=a,b)', () => {
    expect(parseArticleParams({ tag: 'security,jwt' }).tags).toEqual([
      'security',
      'jwt',
    ]);
  });

  it('drops empty tags from comma-joined form', () => {
    expect(parseArticleParams({ tag: 'security,,jwt,' }).tags).toEqual([
      'security',
      'jwt',
    ]);
  });

  it('falls back to default sort on invalid value', () => {
    expect(parseArticleParams({ sort: 'rubbish' }).sort).toBe(DEFAULT_PARAMS.sort);
  });

  it('falls back to default dir on invalid value', () => {
    expect(parseArticleParams({ dir: 'sideways' }).dir).toBe(DEFAULT_PARAMS.dir);
  });

  it('clamps invalid / non-numeric page to 1', () => {
    expect(parseArticleParams({ page: 'NaN' }).page).toBe(1);
    expect(parseArticleParams({ page: '-5' }).page).toBe(1);
    expect(parseArticleParams({ page: '0' }).page).toBe(1);
    expect(parseArticleParams({ page: '' }).page).toBe(1);
  });

  it('accepts a URLSearchParams instance', () => {
    const usp = new URLSearchParams('q=jwt&tag=security&tag=jwt&page=2');
    expect(parseArticleParams(usp)).toEqual({
      q: 'jwt',
      tags: ['security', 'jwt'],
      sort: 'date',
      dir: 'desc',
      page: 2,
    });
  });

  it('takes the first value when an array is given for a single-valued param', () => {
    expect(parseArticleParams({ q: ['first', 'second'] }).q).toBe('first');
    expect(parseArticleParams({ sort: ['reactions', 'date'] }).sort).toBe('reactions');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// serializeArticleParams — default-elision is the load-bearing rule
// ─────────────────────────────────────────────────────────────────────────

describe('serializeArticleParams', () => {
  it('returns empty string for all-default params', () => {
    expect(serializeArticleParams(DEFAULT_PARAMS)).toBe('');
  });

  it('returns empty string for a partial-default merge (page=1, sort=date, dir=desc, q="", tags=[])', () => {
    expect(serializeArticleParams({})).toBe('');
  });

  it('drops q when empty', () => {
    expect(serializeArticleParams({ q: '' })).toBe('');
  });

  it('drops tags when empty array', () => {
    expect(serializeArticleParams({ tags: [] })).toBe('');
  });

  it('drops sort when default', () => {
    expect(serializeArticleParams({ sort: 'date' })).toBe('');
  });

  it('drops page when 1', () => {
    expect(serializeArticleParams({ page: 1 })).toBe('');
  });

  it('emits q when present', () => {
    expect(serializeArticleParams({ q: 'jwt' })).toBe('q=jwt');
  });

  it('emits tags comma-joined', () => {
    expect(serializeArticleParams({ tags: ['security', 'jwt'] })).toBe('tag=security%2Cjwt');
  });

  it('emits non-default sort', () => {
    expect(serializeArticleParams({ sort: 'reactions' })).toBe('sort=reactions');
  });

  it('emits non-default dir', () => {
    expect(serializeArticleParams({ dir: 'asc' })).toBe('dir=asc');
  });

  it('emits page when > 1', () => {
    expect(serializeArticleParams({ page: 3 })).toBe('page=3');
  });

  it('round-trips a non-trivial parameter set through parse → serialize → parse', () => {
    const input: ArticleParams = {
      q: 'security',
      tags: ['jwt', 'postgres'],
      sort: 'reactions',
      dir: 'asc',
      page: 4,
    };
    const qs = serializeArticleParams(input);
    const parsed = parseArticleParams(new URLSearchParams(qs));
    expect(parsed).toEqual(input);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// hasActiveFilters
// ─────────────────────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for defaults', () => {
    expect(hasActiveFilters(DEFAULT_PARAMS)).toBe(false);
  });

  it('returns true when q is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, q: 'jwt' })).toBe(true);
  });

  it('returns true when tags are set', () => {
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, tags: ['security'] })).toBe(true);
  });

  it('sort / dir / page changes alone do NOT count as filters', () => {
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, sort: 'reactions' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, dir: 'asc' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, page: 5 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// filterAndSortArticles
// ─────────────────────────────────────────────────────────────────────────

describe('filterAndSortArticles', () => {
  it('returns all articles, date-desc, on default params', () => {
    const out = filterAndSortArticles(sample(), DEFAULT_PARAMS);
    expect(out.map(a => a.id)).toEqual([1, 2, 3, 4]);
  });

  it('filters by q in title (case-insensitive)', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, q: 'jwt' });
    expect(out.map(a => a.id)).toEqual([2]);
  });

  it('filters by q in description (case-insensitive)', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, q: 'optimize' });
    expect(out.map(a => a.id)).toEqual([4]);
  });

  it('filters by single tag', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, tags: ['security'] });
    expect(out.map(a => a.id)).toEqual([1, 2]);
  });

  it('filters by multiple tags (AND, not OR)', () => {
    const out = filterAndSortArticles(sample(), {
      ...DEFAULT_PARAMS,
      tags: ['security', 'jwt'],
    });
    expect(out.map(a => a.id)).toEqual([2]);
  });

  it('combines q and tags as AND', () => {
    const out = filterAndSortArticles(sample(), {
      ...DEFAULT_PARAMS,
      q: 'security',
      tags: ['jwt'],
    });
    // Only article 2 matches both "security" in title and `jwt` tag.
    expect(out.map(a => a.id)).toEqual([2]);
  });

  it('sorts by reactions desc', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, sort: 'reactions' });
    expect(out.map(a => a.id)).toEqual([1, 2, 3, 4]);
  });

  it('sorts by reactions asc when dir flipped', () => {
    const out = filterAndSortArticles(sample(), {
      ...DEFAULT_PARAMS,
      sort: 'reactions',
      dir: 'asc',
    });
    expect(out.map(a => a.id)).toEqual([4, 3, 2, 1]);
  });

  it('sorts by comments desc', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, sort: 'comments' });
    expect(out.map(a => a.id)).toEqual([1, 3, 2, 4]);
  });

  it('sorts by reading_time desc', () => {
    const out = filterAndSortArticles(sample(), { ...DEFAULT_PARAMS, sort: 'reading_time' });
    expect(out.map(a => a.id)).toEqual([3, 1, 2, 4]);
  });

  it('does not mutate the input array', () => {
    const articles = sample();
    const original = articles.map(a => a.id);
    filterAndSortArticles(articles, { ...DEFAULT_PARAMS, sort: 'reactions' });
    expect(articles.map(a => a.id)).toEqual(original);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getFeaturedArticle — page-1 always-on contract
// ─────────────────────────────────────────────────────────────────────────

describe('getFeaturedArticle', () => {
  it('returns top-by-reactions on page 1 with no filters', () => {
    const articles = sample();
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const featured = getFeaturedArticle(articles, filtered, DEFAULT_PARAMS);
    expect(featured?.id).toBe(1); // 50 reactions, highest
  });

  it('returns top of filtered set when filters are active on page 1', () => {
    const articles = sample();
    const params: ArticleParams = { ...DEFAULT_PARAMS, tags: ['security'] };
    const filtered = filterAndSortArticles(articles, params);
    const featured = getFeaturedArticle(articles, filtered, params);
    // Sort is date-desc default; among security tag, article 1 is newest.
    expect(featured?.id).toBe(1);
  });

  it('returns null on page 2+', () => {
    const articles = sample();
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const featured = getFeaturedArticle(articles, filtered, {
      ...DEFAULT_PARAMS,
      page: 2,
    });
    expect(featured).toBeNull();
  });

  it('returns null when filtered set is empty', () => {
    const articles = sample();
    const params: ArticleParams = { ...DEFAULT_PARAMS, q: 'nothingmatchesthis' };
    const filtered = filterAndSortArticles(articles, params);
    expect(getFeaturedArticle(articles, filtered, params)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// paginateArticles
// ─────────────────────────────────────────────────────────────────────────

describe('paginateArticles', () => {
  // Generate ARTICLES_PER_PAGE * 2 + 3 articles so we get 3 pages
  // with a partial last page (validates totalPages math).
  const many = (): DevToArticle[] =>
    Array.from({ length: ARTICLES_PER_PAGE * 2 + 3 }, (_, i) =>
      make({ id: i + 1, title: `Article ${i + 1}` }),
    );

  it('computes totalPages correctly for a full corpus', () => {
    const articles = many();
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const { totalPages, total } = paginateArticles(filtered, null, 1);
    expect(total).toBe(ARTICLES_PER_PAGE * 2 + 3);
    expect(totalPages).toBe(3);
  });

  it('returns the right slice for each page', () => {
    const articles = many();
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const page1 = paginateArticles(filtered, null, 1).items;
    const page2 = paginateArticles(filtered, null, 2).items;
    const page3 = paginateArticles(filtered, null, 3).items;
    expect(page1).toHaveLength(ARTICLES_PER_PAGE);
    expect(page2).toHaveLength(ARTICLES_PER_PAGE);
    expect(page3).toHaveLength(3);
  });

  it('excludes the featured article from grid items on page 1', () => {
    const articles = sample();
    const featured = articles[0];
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const { items } = paginateArticles(filtered, featured, 1);
    expect(items.map(a => a.id)).not.toContain(featured.id);
  });

  it('totalPages is at least 1 even for an empty filtered set (footer reservation rule)', () => {
    const { totalPages } = paginateArticles([], null, 1);
    expect(totalPages).toBe(1);
  });

  it('does not mutate inputs', () => {
    const articles = many();
    const filtered = filterAndSortArticles(articles, DEFAULT_PARAMS);
    const before = filtered.map(a => a.id);
    paginateArticles(filtered, null, 2);
    expect(filtered.map(a => a.id)).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// computeTagCounts
// ─────────────────────────────────────────────────────────────────────────

describe('computeTagCounts', () => {
  it('counts tags across the corpus', () => {
    const counts = computeTagCounts(sample());
    const map = Object.fromEntries(counts);
    expect(map.security).toBe(2);
    expect(map.jwt).toBe(1);
    expect(map.postgres).toBe(1);
    expect(map.javascript).toBe(1);
  });

  it('orders by frequency desc', () => {
    const articles = [
      ...sample(),
      make({ id: 99, tag_list: ['security', 'security'] }), // boost security count
    ];
    const counts = computeTagCounts(articles);
    expect(counts[0][0]).toBe('security');
  });

  it('caps at the topN argument', () => {
    const articles = Array.from({ length: 20 }, (_, i) =>
      make({ id: i, tag_list: [`tag${i}`] }),
    );
    const counts = computeTagCounts(articles, 5);
    expect(counts.length).toBeLessThanOrEqual(5);
  });

  it('defaults topN to 15', () => {
    const articles = Array.from({ length: 30 }, (_, i) =>
      make({ id: i, tag_list: [`tag${i}`] }),
    );
    expect(computeTagCounts(articles)).toHaveLength(15);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// toggleTagInParams
// ─────────────────────────────────────────────────────────────────────────

describe('toggleTagInParams', () => {
  it('adds a tag when not present', () => {
    const next = toggleTagInParams(DEFAULT_PARAMS, 'jwt');
    expect(next.tags).toEqual(['jwt']);
  });

  it('removes a tag when already present', () => {
    const next = toggleTagInParams(
      { ...DEFAULT_PARAMS, tags: ['jwt', 'security'] },
      'jwt',
    );
    expect(next.tags).toEqual(['security']);
  });

  it('resets page to 1 (PAGINATION_PHILOSOPHY: tag changes are push-not-replace; reader expects to land on page 1)', () => {
    const next = toggleTagInParams(
      { ...DEFAULT_PARAMS, tags: [], page: 5 },
      'jwt',
    );
    expect(next.page).toBe(1);
  });

  it('preserves q, sort, dir', () => {
    const next = toggleTagInParams(
      { q: 'foo', tags: [], sort: 'reactions', dir: 'asc', page: 5 },
      'jwt',
    );
    expect(next.q).toBe('foo');
    expect(next.sort).toBe('reactions');
    expect(next.dir).toBe('asc');
  });

  it('does not mutate input params', () => {
    const input: ArticleParams = { ...DEFAULT_PARAMS, tags: ['security'] };
    toggleTagInParams(input, 'jwt');
    expect(input.tags).toEqual(['security']);
  });
});
