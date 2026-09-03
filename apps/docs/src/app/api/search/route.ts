import { source } from '@/lib/source';
import {
  createFromSource,
  createSearchAPI,
} from 'fumadocs-core/search/server';
import { getSearchTags } from '@/lib/search-utils';
import { buildArticleSearchIndexes } from '@/lib/search-articles';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { CachedArticlesData } from '@/lib/articles.types';
import articlesData from '@/data/articles.json';

// Extended page data type that includes MDX-processed structuredData
interface PageDataWithStructure {
  title?: string;
  description?: string;
  structuredData?: StructuredData;
}

/**
 * Site-wide Cmd+K search (Orama).
 *
 * The dialog hits this single endpoint and expects a flat `SortedResult[]`
 * payload. We back it with two corpora:
 *
 *   1. MDX docs under `/docs/**` — via Fumadocs `createFromSource`, which
 *      preserves auto-breadcrumbs walked from the page tree.
 *   2. Cached Dev.to articles — via `createSearchAPI('advanced', ...)` with
 *      synthetic indexes built from `articles.json`.
 *
 * Results are returned docs-first, then articles, so the keyboard-driven
 * default landing on the first result stays on a doc page (matching the
 * historical UX). Users can scope to articles only by setting `tag=articles`
 * in the SearchDialog's filter UI.
 */
const docsSearch = createFromSource(source, {
  language: 'english',

  buildIndex: page => {
    const tags = getSearchTags(page.url);
    const data = page.data as unknown as PageDataWithStructure;

    return {
      id: page.url,
      title: data.title ?? 'Untitled',
      description: data.description ?? '',
      url: page.url,
      structuredData: data.structuredData ?? { headings: [], contents: [] },
      tag: tags.length > 0 ? tags : undefined,
    };
  },
});

// Cast through `unknown` because the cached articles.json carries the
// dev.to API's actual response shape (`public_reactions_count`, no
// `user`), but `DevToArticle` declares the older shape used elsewhere
// in the docs app. `buildArticleSearchIndexes` only reads fields that
// exist on both, so the runtime is safe here. Aligning `DevToArticle`
// with reality belongs in a follow-up PR — it touches lock tests that
// pin the current field names and is out of scope for this change.
const articlesSearch = createSearchAPI('advanced', {
  language: 'english',
  indexes: buildArticleSearchIndexes(
    (articlesData as unknown as CachedArticlesData).articles,
  ),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? '';
  const tagParams = url.searchParams.getAll('tag');
  const tag = tagParams.length === 0 ? undefined : tagParams;
  const locale = url.searchParams.get('locale') ?? undefined;

  const [docResults, articleResults] = await Promise.all([
    docsSearch.search(query, { tag, locale }),
    articlesSearch.search(query, { tag, locale }),
  ]);

  return Response.json([...docResults, ...articleResults]);
}
