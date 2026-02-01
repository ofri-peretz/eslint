/**
 * JSON Content Cache with Configurable TTL
 * 
 * Provides a flexible caching layer for JSON files with:
 * - Pattern-based TTL configuration
 * - In-memory cache with expiration
 * - Support for GitHub-hosted JSON files
 * - ISR-compatible fetch with revalidation
 * 
 * Architecture:
 * 1. GH Actions run on schedule (cron) and produce JSON data files
 * 2. JSON files are committed to repo or hosted on GitHub Pages/CDN
 * 3. This cache layer fetches and caches with configurable TTL
 * 4. Next.js ISR revalidates pages based on the TTL patterns
 */

import { unstable_cache } from 'next/cache';

// =============================================================================
// Types
// =============================================================================

export interface CacheConfig {
  /** Default TTL in seconds (used when no pattern matches) */
  defaultTTL: number;
  /** Pattern-specific TTL overrides */
  patterns: CachePattern[];
}

export interface CachePattern {
  /** Glob pattern or regex string to match file paths */
  pattern: string;
  /** TTL in seconds for matching files */
  ttl: number;
  /** Optional description for documentation */
  description?: string;
}

export interface CachedData<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  source: string;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default cache configuration with sensible defaults
 * 
 * TTL Guidelines:
 * - Static reference data: 24 hours (86400)
 * - Semi-dynamic stats: 1 hour (3600)
 * - Frequently updated: 5 minutes (300)
 * - Real-time data: 60 seconds (60)
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour default
  patterns: [
    // Plugin stats (downloads, stars) - update hourly
    {
      pattern: '**/plugin-stats*.json',
      ttl: 3600, // 1 hour
      description: 'NPM download counts and GitHub stars',
    },
    // Rule metadata - update every 6 hours
    {
      pattern: '**/rule-*.json',
      ttl: 21600, // 6 hours
      description: 'Rule documentation metadata',
    },
    // CWE/OWASP reference data - update daily
    {
      pattern: '**/cwe-*.json',
      ttl: 86400, // 24 hours
      description: 'Security reference data (static)',
    },
    {
      pattern: '**/owasp-*.json',
      ttl: 86400, // 24 hours
      description: 'OWASP reference data (static)',
    },
    // Coverage reports - update every 4 hours
    {
      pattern: '**/coverage*.json',
      ttl: 14400, // 4 hours
      description: 'Test coverage reports',
    },
    // Analytics data - update every 15 minutes
    {
      pattern: '**/analytics*.json',
      ttl: 900, // 15 minutes
      description: 'Usage analytics data',
    },
    // Changelog aggregations - update every 2 hours
    {
      pattern: '**/changelog*.json',
      ttl: 7200, // 2 hours
      description: 'Aggregated changelog data',
    },
    // Article/blog data from external sources - update hourly
    {
      pattern: '**/articles*.json',
      ttl: 3600, // 1 hour
      description: 'Dev.to and external article data',
    },
  ],
};

// =============================================================================
// Cache Implementation
// =============================================================================

/**
 * In-memory cache store for development/edge runtime
 * Production should use Redis/Vercel KV for distributed caching
 */
const memoryCache = new Map<string, CachedData<unknown>>();

/**
 * Match a file path against cache patterns
 * Supports glob patterns: ** (any path), * (segment), ? (single char)
 */
function matchPattern(filePath: string, pattern: string): boolean {
  // Escape regex special characters except our glob patterns
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&'); // Escape regex specials
  
  // Replace glob patterns with regex equivalents
  // Use placeholders to avoid double-replacement
  regexPattern = regexPattern
    .replace(/\*\*\//g, '\x00') // Placeholder for **/
    .replace(/\*/g, '[^/]*') // * matches any filename segment (non-slash)
    .replace(/\?/g, '.') // ? matches single character
    .replace(/\x00/g, '(?:.*/)?'); // **/ matches any path prefix or nothing
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Get TTL for a specific file path based on patterns
 */
export function getTTLForPath(
  filePath: string,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): number {
  // Check patterns in order (first match wins)
  for (const { pattern, ttl } of config.patterns) {
    if (matchPattern(filePath, pattern)) {
      return ttl;
    }
  }
  return config.defaultTTL;
}

/**
 * Check if cached data is still valid
 * Uses a type predicate to narrow the type for TypeScript
 */
function isCacheValid<T>(cached: CachedData<T> | undefined): cached is CachedData<T> {
  if (!cached) return false;
  return Date.now() < cached.expiresAt;
}

/**
 * Fetch JSON with caching and configurable TTL
 * 
 * @param url - URL to fetch JSON from
 * @param options - Cache configuration options
 * @returns Cached or fresh data
 */
export async function fetchCachedJSON<T>(
  url: string,
  options?: {
    /** Override TTL for this specific fetch */
    ttl?: number;
    /** Force bypass cache and fetch fresh data */
    forceRefresh?: boolean;
    /** Custom cache config (uses default if not provided) */
    config?: CacheConfig;
    /** Cache key override (defaults to URL) */
    cacheKey?: string;
  }
): Promise<CachedData<T>> {
  const cacheKey = options?.cacheKey || url;
  const config = options?.config || DEFAULT_CACHE_CONFIG;
  const ttl = options?.ttl ?? getTTLForPath(url, config);
  
  // Check memory cache first (unless force refresh)
  if (!options?.forceRefresh) {
    const cached = memoryCache.get(cacheKey) as CachedData<T> | undefined;
    if (isCacheValid(cached)) {
      return cached;
    }
  }
  
  // Fetch fresh data
  const response = await fetch(url, {
    next: { revalidate: ttl }, // Next.js ISR integration
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  
  const data = await response.json() as T;
  const now = Date.now();
  
  const cachedData: CachedData<T> = {
    data,
    fetchedAt: now,
    expiresAt: now + (ttl * 1000),
    source: url,
  };
  
  // Store in memory cache
  memoryCache.set(cacheKey, cachedData);
  
  return cachedData;
}

/**
 * Fetch local JSON file with caching
 * Used for JSON files in the monorepo that are updated by GH Actions
 */
export async function fetchLocalJSON<T>(
  filePath: string,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
    config?: CacheConfig;
  }
): Promise<CachedData<T>> {
  const config = options?.config || DEFAULT_CACHE_CONFIG;
  const ttl = options?.ttl ?? getTTLForPath(filePath, config);
  const cacheKey = `local:${filePath}`;
  
  // Check memory cache first
  if (!options?.forceRefresh) {
    const cached = memoryCache.get(cacheKey) as CachedData<T> | undefined;
    if (isCacheValid(cached)) {
      return cached;
    }
  }
  
  // Dynamic import for filesystem access (server-side only)
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const data = JSON.parse(content) as T;
  
  const now = Date.now();
  const cachedData: CachedData<T> = {
    data,
    fetchedAt: now,
    expiresAt: now + (ttl * 1000),
    source: filePath,
  };
  
  memoryCache.set(cacheKey, cachedData);
  return cachedData;
}

/**
 * Create a cached data loader using Next.js unstable_cache
 * This provides ISR-compatible caching with automatic revalidation
 */
export function createCachedLoader<T>(
  loader: () => Promise<T>,
  options: {
    /** Unique cache key for this loader */
    key: string;
    /** Tags for on-demand revalidation */
    tags?: string[];
    /** TTL in seconds */
    ttl: number;
  }
) {
  return unstable_cache(
    loader,
    [options.key],
    {
      revalidate: options.ttl,
      tags: options.tags,
    }
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Invalidate a specific cache entry
 */
export function invalidateCache(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCacheByPattern(pattern: string): number {
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (matchPattern(key, pattern)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; expiresAt: number; isValid: boolean }>;
} {
  const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
    key,
    expiresAt: value.expiresAt,
    isValid: isCacheValid(value),
  }));
  
  return {
    size: memoryCache.size,
    entries,
  };
}

// =============================================================================
// Pre-configured Loaders
// =============================================================================

/**
 * Load plugin stats with appropriate caching
 */
export const loadPluginStats = createCachedLoader(
  async () => {
    const { data } = await fetchLocalJSON<Record<string, unknown>>(
      'src/data/plugin-stats.json'
    );
    return data;
  },
  {
    key: 'plugin-stats',
    tags: ['stats', 'plugins'],
    ttl: 3600, // 1 hour
  }
);

/**
 * Fetch GitHub-hosted JSON (for GH Pages/Actions output)
 */
export async function fetchGitHubJSON<T>(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  options?: { ttl?: number }
): Promise<CachedData<T>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  return fetchCachedJSON<T>(url, {
    ttl: options?.ttl,
    cacheKey: `github:${owner}/${repo}/${path}`,
  });
}
