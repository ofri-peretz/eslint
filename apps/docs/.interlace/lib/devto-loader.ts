/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * DEV.to article loader — default fetcher for `<DevToCard>`.
 *
 * Default behavior: hit the public DEV.to API. For cache-resilient builds,
 * wire a JSON cache via `createDevToFetcher` (mirrors the tweet-loader pattern).
 *
 * Consumer pattern for opt-in caching:
 *
 *   import cached from '@/data/cached-devto-articles.json';
 *   import { createDevToFetcher } from '#interlace/lib/devto-loader';
 *   import { DevToCard } from '#interlace/components/marketing/devto-card';
 *
 *   const fetcher = createDevToFetcher({ cache: cached });
 *   <DevToCard path="username/slug" fetcher={fetcher} />
 *
 * No third-party package required — DEV.to has a public unauthenticated API.
 */

/**
 * DEV.to article shape. Only the fields the card actually renders are required;
 * the rest are optional because (a) consumer-managed cache JSONs vary in
 * completeness across DEV.to API versions and (b) the card guards every
 * non-required access with conditional rendering.
 */
export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  readable_publish_date: string;
  cover_image: string | null;
  social_image: string;
  reading_time_minutes: number;
  public_reactions_count: number;
  comments_count: number;
  user: {
    name: string;
    username: string;
    // At least one of profile_image / profile_image_90 should be present.
    // Both optional because cache shapes vary; the card falls back gracefully.
    profile_image?: string;
    profile_image_90?: string;
    twitter_username?: string | null;
    github_username?: string | null;
  };
  organization?: {
    name: string;
    username?: string;
    slug?: string;
    profile_image?: string;
    profile_image_90?: string;
  };
  // Optional — present in the live API but may be missing in older cached JSON
  slug?: string;
  path?: string;
  created_at?: string;
  published_at?: string;
  tag_list?: string;
  tags?: string[];
  _cachedAt?: string;
}

export type DevToFetcher = (path: string) => Promise<DevToArticle | undefined>;

/**
 * Cached articles are stored as partial DevToArticle records. Consumer cache
 * JSONs (built by sync scripts at different times) may have missing fields;
 * the card renders what's present and falls back gracefully on the rest.
 * The loader casts back to DevToArticle on read — runtime accesses are guarded.
 */
export interface DevToCacheData {
  articles: Record<string, Partial<DevToArticle> & { id: number; title: string; url: string }>;
  _lastUpdated: string | null;
}

export interface CreateDevToFetcherOptions {
  /** JSON cache imported from a consumer-managed file. */
  cache?: DevToCacheData;
  /** Force-prefer fresh data even when cache exists. Defaults to NODE_ENV === 'development'. */
  preferFresh?: boolean;
  debug?: boolean;
}

const DEVTO_API = 'https://dev.to/api/articles';

function normalizePath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

// Next.js extends `fetch` with a `next.revalidate` option for ISR. Widen
// `RequestInit` locally so the loader compiles in environments without
// `@types/next` in scope (e.g. the baseline-storybook typecheck) while
// still passing the option through at runtime when Next.js IS the host.
// Same pattern used in `components/mdx/remote-markdown.tsx`.
type NextFetchInit = RequestInit & { next?: { revalidate?: number } };

/** No-cache fetcher — call DEV.to directly each time. */
export const defaultDevToFetcher: DevToFetcher = async (path) => {
  const normalized = normalizePath(path);
  try {
    const res = await fetch(`${DEVTO_API}/${normalized}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json', 'User-Agent': 'Interlace-Docs/1.0' },
    } as NextFetchInit);
    if (!res.ok) return undefined;
    return (await res.json()) as DevToArticle;
  } catch {
    return undefined;
  }
};

/** Build a cache-aware fetcher — same fallback semantics as `createTweetFetcher`. */
export function createDevToFetcher(
  options: CreateDevToFetcherOptions = {},
): DevToFetcher {
  const {
    cache,
    preferFresh = process.env.NODE_ENV === 'development',
    debug = false,
  } = options;
  const log = debug ? console.log : () => {};

  return async (path: string) => {
    const normalized = normalizePath(path);
    const cached = cache?.articles[normalized];
    const fromCache = (): DevToArticle | undefined => {
      if (!cached) return undefined;
      const { _cachedAt: _, ...articleData } = cached;
      return articleData as DevToArticle;
    };

    if (!preferFresh && cached) {
      log(`[DevToLoader] Using cached data for ${normalized}`);
      return fromCache();
    }

    const fresh = await defaultDevToFetcher(path);
    if (fresh) return fresh;
    if (cached) {
      log(`[DevToLoader] Falling back to cache for ${normalized}`);
      return fromCache();
    }
    return undefined;
  };
}
