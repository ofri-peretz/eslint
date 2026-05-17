/**
 * Build Orama search indexes for Dev.to articles.
 *
 * The site-wide Cmd+K dialog (Fumadocs) searches MDX docs by default; this
 * builder produces an additional set of `AdvancedIndex` documents — one per
 * cached Dev.to article — so the same dialog can also surface articles by
 * title, description, or tag. The two corpora are merged at request time in
 * `app/api/search/route.ts`.
 *
 * Tagging:
 *   - Every article emits `tag: ['articles']` so the Fumadocs `tag` filter
 *     can scope results to articles only.
 *
 * Breadcrumbs:
 *   - Single-segment `['Articles']` so the SearchDialog renders a clear
 *     source label distinct from the docs pillars (Security / Quality /
 *     Getting Started).
 */

import type { AdvancedIndex } from 'fumadocs-core/search/server';
import type { DevToArticle } from './articles.types';

export const ARTICLE_SEARCH_TAG = 'articles';
export const ARTICLE_BREADCRUMB = 'Articles';

export function buildArticleSearchIndexes(
  articles: readonly DevToArticle[],
): AdvancedIndex[] {
  return articles.map(article => {
    // Combine description + hashtags into one searchable text node. We
    // deliberately do NOT index the article body — the cache only stores
    // metadata, and the title+description+tags carry the discoverability
    // signal users actually search on (topic words, framework names).
    const tagText = article.tag_list.map(t => `#${t}`).join(' ');
    const content = [article.description, tagText].filter(Boolean).join(' ');

    return {
      id: `article-${article.id}`,
      title: article.title,
      description: article.description,
      url: article.url,
      tag: [ARTICLE_SEARCH_TAG],
      breadcrumbs: [ARTICLE_BREADCRUMB],
      structuredData: {
        headings: [],
        // `heading` is required on StructuredDataContent (typed as
        // `string | undefined`) — set it explicitly so TS doesn't infer
        // the property away.
        contents: content ? [{ heading: undefined, content }] : [],
      },
    };
  });
}
