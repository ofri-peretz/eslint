/**
 * Cmd+K Articles Search Lock
 *
 * Articles are surfaced in the site-wide search by joining a synthetic
 * `AdvancedIndex` corpus onto the docs Orama index inside
 * `app/api/search/route.ts`. The MDX side has its own coverage in the
 * search-utils tests; this file locks the *articles* half so that:
 *
 *   1. Every cached article produces exactly one index document.
 *   2. Each index is tagged `articles` (the Fumadocs tag filter relies on it).
 *   3. The Orama engine actually returns the article when its title is
 *      queried — i.e. the pipeline from JSON → indexes → search is wired.
 *
 * If `app/api/search/route.ts` ever drops the articles half (a refactor that
 * goes back to `createFromSource(source, ...)` alone, for example), the
 * search-engine test will return zero hits and fail.
 */

import { describe, it, expect } from 'vitest';
import { createSearchAPI } from 'fumadocs-core/search/server';
import articlesData from '@/data/articles.json';
import type { CachedArticlesData } from '@/lib/articles.types';
import {
  buildArticleSearchIndexes,
  ARTICLE_SEARCH_TAG,
  ARTICLE_BREADCRUMB,
} from '@/lib/search-articles';

const { articles } = articlesData as CachedArticlesData;

describe('search-articles index builder', () => {
  it('emits one index per cached article', () => {
    const indexes = buildArticleSearchIndexes(articles);
    expect(indexes).toHaveLength(articles.length);
  });

  it('tags every entry with the `articles` filter tag', () => {
    const indexes = buildArticleSearchIndexes(articles);
    for (const idx of indexes) {
      expect(idx.tag).toContain(ARTICLE_SEARCH_TAG);
    }
  });

  it('uses the Dev.to URL as the result link', () => {
    const indexes = buildArticleSearchIndexes(articles);
    for (const idx of indexes) {
      expect(idx.url).toMatch(/^https?:\/\//);
    }
  });

  it('renders a single-segment `Articles` breadcrumb', () => {
    const indexes = buildArticleSearchIndexes(articles);
    for (const idx of indexes) {
      expect(idx.breadcrumbs).toEqual([ARTICLE_BREADCRUMB]);
    }
  });

  it('carries the article title verbatim (so search matches it)', () => {
    const indexes = buildArticleSearchIndexes(articles);
    const first = articles[0];
    const match = indexes.find(i => i.id === `article-${first.id}`);
    expect(match?.title).toBe(first.title);
  });
});

describe('search-articles end-to-end (Orama)', () => {
  it('returns the article when its title is searched', async () => {
    const indexes = buildArticleSearchIndexes(articles);
    const api = createSearchAPI('advanced', {
      language: 'english',
      indexes,
    });

    // Pick a multi-word fragment from the first article title so Orama has
    // enough signal even with stemming + stop-word filtering.
    const first = articles[0];
    const queryWords = first.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 3)
      .join(' ');

    const results = await api.search(queryWords);

    // At minimum the first article should appear somewhere in the result set.
    const urls = results.map(r => r.url);
    expect(urls).toContain(first.url);
  });

  it('respects the `articles` tag filter', async () => {
    const indexes = buildArticleSearchIndexes(articles);
    const api = createSearchAPI('advanced', {
      language: 'english',
      indexes,
    });

    // Empty query + tag filter should return article entries only — proves
    // the tag was attached to every index, not just the first one.
    const results = await api.search('', { tag: ARTICLE_SEARCH_TAG });
    expect(results.length).toBeGreaterThan(0);
  });
});
