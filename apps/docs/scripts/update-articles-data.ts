#!/usr/bin/env -S npx tsx
/**
 * Fetch articles from Dev.to API and cache to JSON
 * 
 * Usage: 
 *   tsx apps/docs/scripts/update-articles-data.ts
 * 
 * Environment:
 *   DEV_TO_API_KEY - Optional API key for authenticated endpoint (includes page views)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEVTO_USERNAME = 'ofri-peretz';
const OUTPUT_PATH = join(__dirname, '../src/data/articles.json');

async function fetchArticles() {
  const apiKey = process.env.DEV_TO_API_KEY;
  
  const headers = {
    'Content-Type': 'application/json',
  };

  // Use authenticated API if API key is available (returns page_views_count)
  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  // Authenticated endpoint returns full stats including page_views_count
  const endpoint = apiKey
    ? 'https://dev.to/api/articles/me/all?per_page=100'
    : `https://dev.to/api/articles?username=${DEVTO_USERNAME}&per_page=100`;

  console.log(`📡 Fetching articles from Dev.to (${apiKey ? 'authenticated' : 'public'} API)...`);

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    // If authenticated endpoint fails, try public endpoint as fallback
    if (apiKey && response.status === 401) {
      console.warn('⚠️  Authentication failed, falling back to public API');
      const fallbackResponse = await fetch(
        `https://dev.to/api/articles?username=${DEVTO_USERNAME}&per_page=100`
      );
      if (!fallbackResponse.ok) {
        throw new Error(`Dev.to API error: ${fallbackResponse.status}`);
      }
      const articles = await fallbackResponse.json();
      return { articles, source: 'public' };
    }
    throw new Error(`Dev.to API error: ${response.status}`);
  }

  const articles = await response.json();
  return { articles, source: apiKey ? 'authenticated' : 'public' };
}

// Whitelist the article fields we actually consume on the docs site, with
// String() coercion at the boundary. CodeQL flagged the original spread of
// the raw Dev.to API response into the on-disk JSON cache as "Network data
// written to file" — a compromised upstream API could otherwise inject
// arbitrary fields, prototype-pollution payloads, or non-string scalars into
// our build artifact. Picking explicit fields turns the cache into a typed,
// audit-able surface instead of a passthrough.
function pickArticleFields(article: any) {
  return {
    id: article?.id,
    title: String(article?.title ?? ''),
    description: String(article?.description ?? ''),
    url: String(article?.url ?? ''),
    canonical_url: String(article?.canonical_url ?? article?.url ?? ''),
    cover_image: article?.cover_image ? String(article.cover_image) : null,
    published_at: String(article?.published_at ?? ''),
    readable_publish_date: String(article?.readable_publish_date ?? ''),
    reading_time_minutes: Number(article?.reading_time_minutes ?? 0),
    page_views_count: Number(article?.page_views_count ?? 0),
    public_reactions_count: Number(article?.public_reactions_count ?? 0),
    comments_count: Number(article?.comments_count ?? 0),
    tag_list: Array.isArray(article?.tag_list)
      ? article.tag_list.filter((t: unknown): t is string => typeof t === 'string')
      : [],
  };
}

function processArticles(articles) {
  return articles
    // Filter to only published articles
    .filter(article => article?.published_at)
    // Pick only the fields we render — see pickArticleFields. Drop 'eslint'
    // from the tag list since every article carries it and it's redundant
    // for this site.
    .map(pickArticleFields)
    .map(article => ({
      ...article,
      tag_list: article.tag_list.filter(tag => tag.toLowerCase() !== 'eslint'),
    }))
    // Sort by published date (newest first)
    .sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
}

async function main() {
  try {
    const { articles, source } = await fetchArticles();
    const processedArticles = processArticles(articles);
    
    const data = {
      articles: processedArticles,
      total: processedArticles.length,
      lastUpdated: new Date().toISOString(),
      source,
    };

    // Ensure directory exists
    const outputDir = dirname(OUTPUT_PATH);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Write to JSON file
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`✅ Successfully cached ${processedArticles.length} articles`);
    console.log(`📁 Output: ${OUTPUT_PATH}`);
    console.log(`🔑 Source: ${source} API`);
    console.log(`📅 Last updated: ${data.lastUpdated}`);
    
    // Print tag summary
    const allTags = new Set(processedArticles.flatMap(a => a.tag_list));
    console.log(`🏷️  Unique tags: ${allTags.size}`);
    console.log(`   ${Array.from(allTags).sort().join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    process.exit(1);
  }
}

main();
