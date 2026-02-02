/**
 * Social Embeds Integrity Tests
 * 
 * CRITICAL: These tests validate that all social media embeds (tweets, etc.)
 * referenced in the docs are valid and fetchable at build time.
 * 
 * This prevents embarrassing "Tweet not found" errors on production like:
 * - Deleted tweets
 * - Suspended accounts
 * - Invalid tweet IDs
 * 
 * The tests extract tweet IDs from source files and verify they return
 * valid data from the Twitter/X API.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { getTweet } from 'react-tweet/api';

// ============================================================================
// Configuration
// ============================================================================

const DOCS_ROOT = join(process.cwd(), 'src');
const CONTENT_ROOT = join(process.cwd(), 'content');

// Patterns to find tweet embeds in source files
const TWEET_PATTERNS = [
  // TweetCard component: <TweetCard id="123456789" />
  /<TweetCard\s+[^>]*id=["'](\d+)["']/g,
  // react-tweet Tweet component: <Tweet id="123456789" />
  /<Tweet\s+[^>]*id=["'](\d+)["']/g,
];

// ============================================================================
// Utility Functions
// ============================================================================

function getAllSourceFiles(dir: string, extensions: string[] = ['.tsx', '.jsx', '.ts', '.js', '.mdx']): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    // Skip node_modules and hidden directories
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

function extractTweetIds(content: string): { id: string; context: string }[] {
  const tweetIds: { id: string; context: string }[] = [];
  
  for (const pattern of TWEET_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const id = match[1];
      // Get some context around the match
      const startIndex = Math.max(0, match.index - 20);
      const endIndex = Math.min(content.length, match.index + match[0].length + 20);
      const context = content.slice(startIndex, endIndex).replace(/\s+/g, ' ').trim();
      
      tweetIds.push({ id, context });
    }
  }
  
  return tweetIds;
}

function getRelativePath(fullPath: string, baseDir: string): string {
  return fullPath.replace(baseDir + '/', '');
}

// ============================================================================
// Tests: Tweet Embed Validation
// ============================================================================

describe('Social Embeds - Tweet Integrity', () => {
  let tweetReferences: Map<string, { files: string[]; contexts: string[] }>;
  
  beforeAll(async () => {
    tweetReferences = new Map();
    
    // Scan source files
    const sourceFiles = getAllSourceFiles(DOCS_ROOT);
    const contentFiles = getAllSourceFiles(CONTENT_ROOT, ['.mdx', '.md']);
    const allFiles = [...sourceFiles, ...contentFiles];
    
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const tweets = extractTweetIds(content);
      
      for (const { id, context } of tweets) {
        const existing = tweetReferences.get(id) ?? { files: [], contexts: [] };
        const relativePath = file.includes('content/') 
          ? getRelativePath(file, CONTENT_ROOT)
          : getRelativePath(file, DOCS_ROOT);
        
        if (!existing.files.includes(relativePath)) {
          existing.files.push(relativePath);
          existing.contexts.push(context);
        }
        
        tweetReferences.set(id, existing);
      }
    }
  });

  it('should find tweet embeds in source files', () => {
    // This test documents what tweet embeds exist
    if (tweetReferences.size === 0) {
      console.log('No tweet embeds found in source files');
      return;
    }
    
    console.log(`Found ${tweetReferences.size} unique tweet ID(s) across docs:`);
    for (const [id, { files }] of tweetReferences) {
      console.log(`  - Tweet ${id}: used in ${files.join(', ')}`);
    }
    
    expect(tweetReferences.size).toBeGreaterThan(0);
  });

  it('should validate all tweet IDs are fetchable (no "Tweet not found" errors)', async () => {
    if (tweetReferences.size === 0) {
      console.log('No tweets to validate');
      return;
    }

    const brokenTweets: { 
      id: string; 
      files: string[]; 
      error: string 
    }[] = [];

    // Validate each tweet ID
    for (const [id, { files, contexts }] of tweetReferences) {
      try {
        const tweet = await getTweet(id);
        
        if (!tweet) {
          brokenTweets.push({
            id,
            files,
            error: 'Tweet not found (returned undefined)',
          });
        } else {
          console.log(`✓ Tweet ${id} is valid: "@${tweet.user?.screen_name}" - "${tweet.text?.slice(0, 50)}..."`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        brokenTweets.push({
          id,
          files,
          error: errorMessage,
        });
      }
    }

    // Report failures with clear instructions
    if (brokenTweets.length > 0) {
      const report = brokenTweets.map(({ id, files, error }) => 
        `\n  Tweet ID: ${id}\n  Used in: ${files.join(', ')}\n  Error: ${error}`
      ).join('\n');

      expect(brokenTweets).toHaveLength(0);
      console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  BROKEN TWEET EMBEDS DETECTED - "Tweet not found" errors will     ║
║  appear on the production site!                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  ACTION REQUIRED:                                                  ║
║  1. Find a valid, public tweet to replace the broken embed        ║
║  2. Or remove the TweetCard component entirely                     ║
║  3. Or replace with a static testimonial card                      ║
╚════════════════════════════════════════════════════════════════════╝

Broken tweets found:${report}

To fix: Update the tweet ID in the file(s) listed above.
`);
    }

    expect(
      brokenTweets,
      `Found ${brokenTweets.length} broken tweet embed(s) that will show "Tweet not found" on production!`
    ).toHaveLength(0);
  }, 30000); // 30s timeout for network calls
});

// ============================================================================
// Tests: Static Analysis for Common Issues
// ============================================================================

describe('Social Embeds - Static Validation', () => {
  let tweetReferences: Map<string, { files: string[]; contexts: string[] }>;
  
  beforeAll(async () => {
    tweetReferences = new Map();
    
    const sourceFiles = getAllSourceFiles(DOCS_ROOT);
    const contentFiles = getAllSourceFiles(CONTENT_ROOT, ['.mdx', '.md']);
    const allFiles = [...sourceFiles, ...contentFiles];
    
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const tweets = extractTweetIds(content);
      
      for (const { id, context } of tweets) {
        const existing = tweetReferences.get(id) ?? { files: [], contexts: [] };
        const relativePath = file.includes('content/') 
          ? getRelativePath(file, CONTENT_ROOT)
          : getRelativePath(file, DOCS_ROOT);
        
        if (!existing.files.includes(relativePath)) {
          existing.files.push(relativePath);
          existing.contexts.push(context);
        }
        
        tweetReferences.set(id, existing);
      }
    }
  });

  it('should not have obviously invalid tweet IDs (too short/long)', () => {
    const invalidIds: { id: string; files: string[]; reason: string }[] = [];
    
    for (const [id, { files }] of tweetReferences) {
      // Twitter IDs are typically 18-19 digits for recent tweets
      // Very old tweets might be shorter (10+ digits)
      // Anything < 10 digits or > 25 digits is likely invalid
      if (id.length < 10) {
        invalidIds.push({
          id,
          files,
          reason: `Tweet ID too short (${id.length} digits, expected 10+)`,
        });
      } else if (id.length > 25) {
        invalidIds.push({
          id,
          files,
          reason: `Tweet ID too long (${id.length} digits, expected ≤25)`,
        });
      }
      
      // Check it's all digits
      if (!/^\d+$/.test(id)) {
        invalidIds.push({
          id,
          files,
          reason: 'Tweet ID contains non-numeric characters',
        });
      }
    }
    
    if (invalidIds.length > 0) {
      console.error('Invalid tweet ID formats found:');
      for (const { id, files, reason } of invalidIds) {
        console.error(`  - "${id}" in ${files.join(', ')}: ${reason}`);
      }
    }
    
    expect(
      invalidIds,
      `Found ${invalidIds.length} tweet ID(s) with invalid format`
    ).toHaveLength(0);
  });

  it('should not have duplicate tweet embeds across pages', () => {
    const duplicates: { id: string; count: number; files: string[] }[] = [];
    
    for (const [id, { files }] of tweetReferences) {
      if (files.length > 1) {
        duplicates.push({
          id,
          count: files.length,
          files,
        });
      }
    }
    
    // This is just a warning, not a failure
    if (duplicates.length > 0) {
      console.warn('Tweet IDs used in multiple locations (might be intentional):');
      for (const { id, count, files } of duplicates) {
        console.warn(`  - Tweet ${id}: used ${count} times in ${files.join(', ')}`);
      }
    }
  });
});

// ============================================================================
// Tests: Tweet Cache Validation
// ============================================================================

describe('Social Embeds - Cache Validation', () => {
  const CACHE_FILE = join(process.cwd(), 'src/data/cached-tweets.json');
  
  it('should have cached-tweets.json file', () => {
    expect(existsSync(CACHE_FILE)).toBe(true);
  });

  it('should have all embedded tweets cached', () => {
    if (!existsSync(CACHE_FILE)) {
      throw new Error('Cache file does not exist - run `npm run sync-tweets` first');
    }

    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    
    // Extract all tweet IDs from source files
    const sourceFiles = getAllSourceFiles(DOCS_ROOT);
    const contentFiles = getAllSourceFiles(CONTENT_ROOT, ['.mdx', '.md']);
    const allFiles = [...sourceFiles, ...contentFiles];
    
    const usedTweetIds = new Set<string>();
    
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const tweets = extractTweetIds(content);
      tweets.forEach(({ id }) => usedTweetIds.add(id));
    }
    
    const missingFromCache: string[] = [];
    
    for (const id of usedTweetIds) {
      if (!cache.tweets[id]) {
        missingFromCache.push(id);
      }
    }
    
    if (missingFromCache.length > 0) {
      console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  TWEET CACHE OUT OF SYNC                                           ║
╠════════════════════════════════════════════════════════════════════╣
║  The following tweet IDs are used in source files but not cached: ║
║  ${missingFromCache.join(', ').padEnd(64)}║
║                                                                    ║
║  Run: npm run sync-tweets                                          ║
╚════════════════════════════════════════════════════════════════════╝
`);
    }
    
    expect(
      missingFromCache,
      `${missingFromCache.length} tweet(s) missing from cache. Run 'npm run sync-tweets'`
    ).toHaveLength(0);
  });

  it('should have valid tweet data in cache', () => {
    if (!existsSync(CACHE_FILE)) {
      return;
    }

    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    const invalidEntries: { id: string; reason: string }[] = [];
    
    for (const [id, tweet] of Object.entries(cache.tweets)) {
      if (!tweet || typeof tweet !== 'object') {
        invalidEntries.push({ id, reason: 'Invalid tweet object' });
        continue;
      }
      
      const tweetData = tweet as Record<string, unknown>;
      
      if (!tweetData.text) {
        invalidEntries.push({ id, reason: 'Missing tweet text' });
      }
      
      if (!tweetData.user) {
        invalidEntries.push({ id, reason: 'Missing user data' });
      }
    }
    
    if (invalidEntries.length > 0) {
      console.error('Invalid cache entries found:');
      for (const { id, reason } of invalidEntries) {
        console.error(`  - Tweet ${id}: ${reason}`);
      }
    }
    
    expect(invalidEntries).toHaveLength(0);
  });
});
