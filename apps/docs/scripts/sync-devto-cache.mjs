#!/usr/bin/env node
/**
 * Sync DEV.to Article Cache
 * 
 * This script fetches DEV.to article data and caches it locally
 * to prevent API rate limits during builds.
 * 
 * Usage: node scripts/sync-devto-cache.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_FILE = join(__dirname, '../src/data/cached-devto-articles.json');
const SRC_DIR = join(__dirname, '../src');

// DEV.to article paths to cache (format: username/slug)
// These are extracted from usage in the codebase
const ARTICLE_PATHS = [
  'devteam/top-7-featured-dev-posts-of-the-week-2cgm',
];

async function fetchArticle(path) {
  try {
    const response = await fetch(`https://dev.to/api/articles/${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ Failed to fetch article ${path}:`, error.message);
    return null;
  }
}

async function scanForArticlePaths() {
  // This could be expanded to scan source files for DevToCard usage
  // For now, we use the hardcoded list
  return ARTICLE_PATHS;
}

async function main() {
  console.log('🔄 Syncing DEV.to article cache...\n');
  
  // Load existing cache
  let cache = { articles: {}, _lastUpdated: null };
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      console.log('⚠️  Could not parse existing cache, starting fresh');
    }
  }
  
  // Get article paths to fetch
  const paths = await scanForArticlePaths();
  console.log(`📰 Found ${paths.length} article(s) to cache:\n`);
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const path of paths) {
    process.stdout.write(`  → ${path}... `);
    
    const article = await fetchArticle(path);
    
    if (article) {
      // Keep only needed fields to keep cache small
      const minimalistArticle = {
        id: article.id,
        title: article.title,
        description: article.description,
        readable_publish_date: article.readable_publish_date,
        url: article.url,
        cover_image: article.cover_image,
        social_image: article.social_image,
        tag_list: article.tag_list,
        reading_time_minutes: article.reading_time_minutes,
        public_reactions_count: article.public_reactions_count,
        comments_count: article.comments_count,
        user: {
          name: article.user.name,
          username: article.user.username,
          profile_image_90: article.user.profile_image_90,
        },
        organization: article.organization ? {
          name: article.organization.name,
        } : null,
      };

      cache.articles[path] = {
        ...minimalistArticle,
        _cachedAt: new Date().toISOString()
      };
      console.log(`✓ "${article.title.slice(0, 40)}..."`);
      successCount++;
    } else {
      failedCount++;
      // Keep old cached version if available
      if (cache.articles[path]) {
        console.log('(keeping cached version)');
      } else {
        console.log('(no cache available)');
      }
    }
  }
  
  // Update timestamp and save
  cache._lastUpdated = new Date().toISOString();
  cache._comment = 'Cached DEV.to article data to avoid API rate limits during builds. Updated by scripts/sync-devto-cache.mjs';
  
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  
  console.log(`\n✅ Cache updated: ${successCount} succeeded, ${failedCount} failed`);
  console.log(`📁 Saved to: ${CACHE_FILE}\n`);
}

main().catch(console.error);
