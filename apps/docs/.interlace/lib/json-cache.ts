/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * JSON Content Cache with Configurable TTL
 *
 * Generic caching layer for JSON files with:
 * - Pattern-based TTL configuration
 * - In-memory cache with expiration
 * - Support for GitHub-hosted JSON files
 * - ISR-compatible fetch with revalidation
 *
 * Architecture:
 * 1. GH Actions run on schedule and produce JSON data files
 * 2. JSON files are committed to repo or hosted on GitHub Pages/CDN
 * 3. This cache layer fetches and caches with configurable TTL
 * 4. Next.js ISR revalidates pages based on the TTL patterns
 */

import { unstable_cache } from 'next/cache';

export interface CacheConfig {
  /** Default TTL in seconds (used when no pattern matches) */
  defaultTTL: number;
  /** Pattern-specific TTL overrides */
  patterns: CachePattern[];
}

export interface CachePattern {
  /** Glob pattern to match file paths (** /, *, ?) */
  pattern: string;
  /** TTL in seconds for matching files */
  ttl: number;
  description?: string;
}

export interface CachedData<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  source: string;
}

/**
 * Default cache configuration with sensible defaults
 *
 * TTL guidelines:
 * - Static reference data: 24 hours (86400)
 * - Semi-dynamic stats: 1 hour (3600)
 * - Frequently updated: 5 minutes (300)
 * - Real-time data: 60 seconds (60)
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 3600,
  patterns: [
    { pattern: '**/stats*.json', ttl: 3600, description: 'NPM/GitHub stats' },
    { pattern: '**/coverage*.json', ttl: 14400, description: 'Test coverage reports' },
    { pattern: '**/changelog*.json', ttl: 7200, description: 'Aggregated changelogs' },
    { pattern: '**/articles*.json', ttl: 3600, description: 'External article data' },
    { pattern: '**/analytics*.json', ttl: 900, description: 'Usage analytics' },
  ],
};

const memoryCache = new Map<string, CachedData<unknown>>();

function matchPattern(filePath: string, pattern: string): boolean {
  let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  regexPattern = regexPattern
    .replace(/\*\*\//g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    // eslint-disable-next-line no-control-regex
    .replace(/\x00/g, '(?:.*/)?');
  return new RegExp(`^${regexPattern}$`).test(filePath);
}

export function getTTLForPath(
  filePath: string,
  config: CacheConfig = DEFAULT_CACHE_CONFIG,
): number {
  for (const { pattern, ttl } of config.patterns) {
    if (matchPattern(filePath, pattern)) return ttl;
  }
  return config.defaultTTL;
}

function isCacheValid<T>(cached: CachedData<T> | undefined): cached is CachedData<T> {
  if (!cached) return false;
  return Date.now() < cached.expiresAt;
}

export async function fetchCachedJSON<T>(
  url: string,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
    config?: CacheConfig;
    cacheKey?: string;
  },
): Promise<CachedData<T>> {
  const cacheKey = options?.cacheKey || url;
  const config = options?.config || DEFAULT_CACHE_CONFIG;
  const ttl = options?.ttl ?? getTTLForPath(url, config);

  if (!options?.forceRefresh) {
    const cached = memoryCache.get(cacheKey) as CachedData<T> | undefined;
    if (isCacheValid(cached)) return cached;
  }

  const response = await fetch(url, {
    next: { revalidate: ttl },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const data = (await response.json()) as T;
  const now = Date.now();
  const cachedData: CachedData<T> = {
    data,
    fetchedAt: now,
    expiresAt: now + ttl * 1000,
    source: url,
  };

  memoryCache.set(cacheKey, cachedData);
  return cachedData;
}

export async function fetchLocalJSON<T>(
  filePath: string,
  options?: { ttl?: number; forceRefresh?: boolean; config?: CacheConfig },
): Promise<CachedData<T>> {
  const config = options?.config || DEFAULT_CACHE_CONFIG;
  const ttl = options?.ttl ?? getTTLForPath(filePath, config);
  const cacheKey = `local:${filePath}`;

  if (!options?.forceRefresh) {
    const cached = memoryCache.get(cacheKey) as CachedData<T> | undefined;
    if (isCacheValid(cached)) return cached;
  }

  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const data = JSON.parse(content) as T;
  const now = Date.now();
  const cachedData: CachedData<T> = {
    data,
    fetchedAt: now,
    expiresAt: now + ttl * 1000,
    source: filePath,
  };

  memoryCache.set(cacheKey, cachedData);
  return cachedData;
}

export function createCachedLoader<T>(
  loader: () => Promise<T>,
  options: { key: string; tags?: string[]; ttl: number },
) {
  return unstable_cache(loader, [options.key], {
    revalidate: options.ttl,
    tags: options.tags,
  });
}

export async function fetchGitHubJSON<T>(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  options?: { ttl?: number },
): Promise<CachedData<T>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  return fetchCachedJSON<T>(url, {
    ttl: options?.ttl,
    cacheKey: `github:${owner}/${repo}/${path}`,
  });
}

export function invalidateCache(key: string): boolean {
  return memoryCache.delete(key);
}

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

export function clearCache(): void {
  memoryCache.clear();
}

export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; expiresAt: number; isValid: boolean }>;
} {
  const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
    key,
    expiresAt: value.expiresAt,
    isValid: isCacheValid(value),
  }));
  return { size: memoryCache.size, entries };
}
