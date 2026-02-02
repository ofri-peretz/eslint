#!/usr/bin/env node
/**
 * Sync Tweet Cache Script
 * 
 * Fetches tweet data from Twitter API and caches it locally.
 * This prevents "Tweet not found" errors during Vercel builds
 * when Twitter API is rate-limited or unavailable.
 * 
 * Usage:
 *   node scripts/sync-tweet-cache.mjs
 *   node scripts/sync-tweet-cache.mjs --force  # Force refresh all tweets
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
function getAllSourceFiles(dir, extensions = ['.tsx', '.jsx', '.ts', '.js', '.mdx']) {
  const files = [];
  
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
function extractTweetIds(content) {
  const ids = new Set();
  
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
async function fetchTweet(id) {
  // Dynamic import for ESM compatibility
  const { getTweet } = await import('react-tweet/api');
  return getTweet(id);
}

/**
 * Load existing cache
 */
function loadCache() {
  if (!existsSync(CACHE_FILE)) {
    return { tweets: {}, _lastUpdated: null };
  }
  
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch (error) {
    console.warn('⚠️ Could not parse cache file, starting fresh');
    return { tweets: {}, _lastUpdated: null };
  }
}

/**
 * Save cache to file
 */
function saveCache(cache) {
  cache._lastUpdated = new Date().toISOString();
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if a cached tweet is still fresh
 */
function isCacheFresh(cachedTweet) {
  if (!cachedTweet || !cachedTweet._cachedAt) {
    return false;
  }
  
  const cachedTime = new Date(cachedTweet._cachedAt).getTime();
  const now = Date.now();
  
  return (now - cachedTime) < CACHE_TTL_MS;
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
  
  const allTweetIds = new Set();
  
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
  
  for (const id of allTweetIds) {
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
        // Store the tweet with cache metadata
        cache.tweets[id] = {
          ...tweet,
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
        }
      }
    } catch (error) {
      console.error(`  ✗ ${id}: API error - ${error.message}`);
      failed++;
      
      // Keep old cached version if available
      if (cache.tweets[id]) {
        console.log(`     ↳ Keeping stale cache as fallback`);
      }
    }
    
    // Rate limit protection: wait between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save updated cache
  saveCache(cache);
  
  console.log(`\n✅ Tweet cache sync complete:`);
  console.log(`   Fetched: ${fetched}`);
  console.log(`   Used cache: ${cached}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} tweet(s) could not be fetched.`);
    console.log(`   Check if these tweets are deleted or the accounts are private.`);
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

export { extractTweetIds, loadCache, saveCache };
