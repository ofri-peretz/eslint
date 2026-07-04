#!/usr/bin/env -S npx tsx
/**
 * Sync Tweet Cache Script
 * 
 * Fetches tweet data from Twitter API and caches it locally.
 * This prevents "Tweet not found" errors during Vercel builds
 * when Twitter API is rate-limited or unavailable.
 * 
 * Usage:
 *   tsx scripts/sync-tweet-cache.ts
 *   tsx scripts/sync-tweet-cache.ts --force  # Force refresh all tweets
 * 
 * The script scans source files for TweetCard usages and fetches
 * the tweet data for each ID found.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, '../src');
const CONTENT_ROOT = join(__dirname, '../content');
const CACHE_FILE = join(__dirname, '../src/data/cached-tweets.json');

// How long before cached tweets are considered stale (7 days)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Patterns to find tweet embeds in source files
 */
const TWEET_PATTERNS = [
  /<TweetCard\s+[^>]*id=["'](\d+)["']/g,
  /<Tweet\s+[^>]*id=["'](\d+)["']/g,
];

/**
 * Recursively get all source files
 */
function getAllSourceFiles(dir: string, extensions: string[] = ['.tsx', '.jsx', '.ts', '.js', '.mdx']): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    if (entry.startsWith('.') || entry === 'node_modules' || entry === '__tests__') {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract tweet IDs from file content
 */
function extractTweetIds(content: string) {
  const ids = new Set<string>();
  
  for (const pattern of TWEET_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      ids.add(match[1]);
    }
  }
  
  return Array.from(ids);
}

/**
 * Dynamically import react-tweet/api
 */
async function fetchTweet(id: string) {
  // Dynamic import for ESM compatibility
  const { getTweet } = await import('react-tweet/api');
  return getTweet(id);
}

/**
 * Load existing cache
 */
function loadCache(): TweetCache {
  if (!existsSync(CACHE_FILE)) {
    return { tweets: {}, _lastUpdated: null };
  }
  
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    console.warn('⚠️ Could not parse cache file, starting fresh');
    return { tweets: {}, _lastUpdated: null };
  }
}

export interface TweetCache {
  tweets: Record<string, any>;
  _lastUpdated: string | null;
}

/**
 * Save cache to file
 */
function saveCache(cache: TweetCache) {
  // Read directly and catch ENOENT instead of `existsSync()` + `readFileSync()`
  // (CodeQL: "Potential file system race condition" — the file could vanish
  // between the two calls). Any read/parse failure means we should just write.
  let writeNeeded = true;
  try {
    const existing = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    if (JSON.stringify(existing.tweets) === JSON.stringify(cache.tweets)) {
      writeNeeded = false;
      console.log(`\n✅ cached-tweets.json data unchanged, skipping write to prevent git churn.`);
    }
  } catch {
    // Missing or unparseable — fall through to write.
  }

  if (writeNeeded) {
    cache._lastUpdated = new Date().toISOString();
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  }
}

/**
 * Check if a cached tweet is still fresh
 */
function isCacheFresh(cachedTweet: any) {
  if (!cachedTweet || !cachedTweet._cachedAt) {
    return false;
  }

  const cachedTime = new Date(cachedTweet._cachedAt).getTime();
  const now = Date.now();

  return (now - cachedTime) < CACHE_TTL_MS;
}

/**
 * Pull the resolved card preview image URL from a tweet, if any.
 * Twitter's syndication endpoint sometimes drops these bindings —
 * see `mergePreservedCardImages`. The lock test asserts the same path.
 */
function getCardImageUrl(tweet: any) {
  const bv = tweet?.card?.binding_values;
  return (
    bv?.photo_image_full_size_large?.image_value?.url ||
    bv?.thumbnail_image_large?.image_value?.url ||
    bv?.thumbnail_image?.image_value?.url ||
    null
  );
}

/**
 * Twitter's syndication endpoint is non-deterministic: the same tweet
 * sometimes returns `card.binding_values` with image URLs, and sometimes
 * returns the same `card` with text-only bindings. If the previous cache
 * had a working preview image and the new fetch lost it, retain the
 * previous image bindings rather than silently regressing the card.
 * The HTTP check downstream still rejects stale 404 URLs.
 */
function mergePreservedCardImages(fresh: any, previous: any) {
  if (!previous?.card?.binding_values) return fresh;
  if (getCardImageUrl(fresh)) return fresh;
  if (!getCardImageUrl(previous)) return fresh;
  return {
    ...fresh,
    card: {
      ...fresh.card,
      binding_values: {
        ...fresh.card?.binding_values,
        ...previous.card.binding_values,
      },
    },
  };
}

/**
 * HEAD-check a URL. Returns the HTTP status, or 0 on network error.
 */
async function headStatus(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * Exit-code policy for the sync run.
 *
 * Only hard-fail when a tweet could not be fetched at all AND has no
 * cached fallback (`failedWithoutFallback`) — that's the case that
 * renders "Tweet not found" in production. An unreachable card *image*
 * on an already-cached tweet is advisory: Twitter deletes/rotates
 * `pbs.twimg.com/card_img/*` assets upstream and no amount of
 * re-running the build can bring them back, so failing the build just
 * wedges every deploy behind an upstream 404 we cannot fix
 * (regression: 2026-07-04, tweet 2006790779537121585).
 */
function shouldFailSync(failedWithoutFallback: number, _unreachableCardImages: number) {
  return failedWithoutFallback > 0;
}

/**
 * Main sync function
 */
async function main() {
  const forceRefresh = process.argv.includes('--force');
  
  console.log('🐦 Syncing tweet cache...\n');
  
  // Find all tweet IDs in source files
  const sourceFiles = getAllSourceFiles(DOCS_ROOT);
  const contentFiles = getAllSourceFiles(CONTENT_ROOT, ['.mdx', '.md']);
  const allFiles = [...sourceFiles, ...contentFiles];
  
  const allTweetIds = new Set<string>();
  
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8');
    const ids = extractTweetIds(content);
    ids.forEach(id => allTweetIds.add(id));
  }
  
  if (allTweetIds.size === 0) {
    console.log('No tweet embeds found in source files.');
    return;
  }
  
  console.log(`Found ${allTweetIds.size} unique tweet ID(s) to cache:\n`);
  
  // Load existing cache
  const cache = loadCache();
  
  let fetched = 0;
  let cached = 0;
  let failed = 0;
  let failedWithoutFallback = 0;
  
  for (const id of Array.from(allTweetIds)) {
    // Check if we can use cached version
    if (!forceRefresh && cache.tweets[id] && isCacheFresh(cache.tweets[id])) {
      const tweet = cache.tweets[id];
      console.log(`  ✓ ${id}: Using cached data (@${tweet.user?.screen_name})`);
      cached++;
      continue;
    }
    
    // Fetch from Twitter API
    try {
      console.log(`  ⏳ ${id}: Fetching from Twitter API...`);
      const tweet = await fetchTweet(id);
      
      if (tweet) {
        // Defend against the syndication endpoint dropping image bindings:
        // if the previous cache had a preview image and the new fetch lost
        // it, retain the previous bindings. The HEAD check below catches
        // stale URLs.
        const preserved = mergePreservedCardImages(tweet, cache.tweets[id]);
        if (preserved !== tweet) {
          console.log(`  ↳ ${id}: Preserved previous card image bindings (API returned text-only card)`);
        }
        cache.tweets[id] = {
          ...preserved,
          _cachedAt: new Date().toISOString(),
        };
        console.log(`  ✓ ${id}: Fetched (@${tweet.user?.screen_name})`);
        fetched++;
      } else {
        console.error(`  ✗ ${id}: Tweet not found (deleted or private?)`);
        failed++;

        // Keep old cached version if available
        if (cache.tweets[id]) {
          console.log(`     ↳ Keeping stale cache as fallback`);
        } else {
          failedWithoutFallback++;
        }
      }
    } catch (error) {
      console.error(`  ✗ ${id}: API error - ${(error as Error).message}`);
      failed++;

      // Keep old cached version if available
      if (cache.tweets[id]) {
        console.log(`     ↳ Keeping stale cache as fallback`);
      } else {
        failedWithoutFallback++;
      }
    }
    
    // Rate limit protection: wait between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save updated cache
  saveCache(cache);

  // Verify every cached preview image URL is live. Twitter rotates
  // `pbs.twimg.com/card_img/*` IDs faster than our 7-day TTL, so a "fresh"
  // cache can still hold a 404 URL. This check is ADVISORY: when Twitter
  // deletes a card image upstream, re-running the build can never fix it,
  // so a hard failure here just wedges every deploy (2026-07-04). We warn
  // loudly and keep the stale entry — the card renders text-only until a
  // human swaps the embed. The lock test still catches the structural
  // case (URL missing from JSON) at PR time.
  console.log(`\n🔎 Verifying cached preview image URLs are live…`);
  let unreachable = 0;
  for (const [id, t] of Object.entries(cache.tweets)) {
    const url = getCardImageUrl(t);
    if (!url) {
      console.log(`  · ${id}: no card preview image — skipped`);
      continue;
    }
    const status = await headStatus(url);
    if (status >= 200 && status < 300) {
      console.log(`  ✓ ${id}: card image OK (${status})`);
    } else {
      console.warn(`  ⚠ ${id}: card image unreachable (HTTP ${status}) — ${url}`);
      console.warn(`     ↳ Keeping stale cache entry; the card renders without a preview image until the embed is replaced.`);
      unreachable++;
    }
  }

  console.log(`\n✅ Tweet cache sync complete:`);
  console.log(`   Fetched: ${fetched}`);
  console.log(`   Used cache: ${cached}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Unreachable card images: ${unreachable}`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} tweet(s) could not be fetched.`);
  }
  if (unreachable > 0) {
    console.log(`\n⚠️  ${unreachable} cached card image URL(s) returned non-2xx (upstream deleted/rotated).`);
    console.log(`   Advisory only — the build proceeds with the stale cache entry.`);
  }

  if (shouldFailSync(failedWithoutFallback, unreachable)) {
    console.error(`\n❌ ${failedWithoutFallback} tweet(s) failed to fetch with NO cached fallback — these would render "Tweet not found" in production.`);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { extractTweetIds, loadCache, saveCache, getCardImageUrl, mergePreservedCardImages, shouldFailSync };
