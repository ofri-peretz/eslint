/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Tweet loader — default fetcher for `<TweetCard>`.
 *
 * - Default behavior: fetch via `react-tweet/api` directly.
 * - Cache fallback: if the consumer wires a JSON cache, the loader prefers
 *   cache in production builds (avoids Twitter rate limits during Vercel
 *   builds) and prefers fresh data in development.
 *
 * Consumer pattern for opt-in caching:
 *
 *   import cached from '@/data/cached-tweets.json';
 *   import { createTweetFetcher } from '#interlace/lib/tweet-loader';
 *   import { TweetCard } from '#interlace/components/marketing/tweet-card';
 *
 *   const fetcher = createTweetFetcher({ cache: cached });
 *   <TweetCard id="123" fetcher={fetcher} />
 *
 * Peer deps required: `react-tweet`.
 */

import { getTweet, type Tweet } from 'react-tweet/api';

export type TweetFetcher = (id: string) => Promise<Tweet | undefined>;

export interface TweetCacheData {
  tweets: Record<string, Record<string, unknown> & { _cachedAt?: string }>;
  _lastUpdated: string | null;
}

export interface CreateTweetFetcherOptions {
  /** JSON cache imported from a consumer-managed file. */
  cache?: TweetCacheData;
  /** Force-prefer fresh data even when cache exists. Defaults to NODE_ENV === 'development'. */
  preferFresh?: boolean;
  /** Verbose logging for debugging build-time fetches. */
  debug?: boolean;
}

/**
 * Default fetcher with no cache — hits the `react-tweet` API every call.
 * Suitable for runtime SSR where cache is not needed.
 */
export const defaultTweetFetcher: TweetFetcher = async (id) => {
  try {
    return await getTweet(id);
  } catch {
    return undefined;
  }
};

/**
 * Build a fetcher with optional JSON-cache fallback.
 *
 * Resolution order:
 *   - In dev (or `preferFresh: true`): try API → fall back to cache.
 *   - In prod builds (default): try cache → fall back to API.
 */
export function createTweetFetcher(options: CreateTweetFetcherOptions = {}): TweetFetcher {
  const {
    cache,
    preferFresh = process.env.NODE_ENV === 'development',
    debug = false,
  } = options;
  const log = debug ? console.log : () => {};

  return async (id: string) => {
    const cached = cache?.tweets[id];
    const fromCache = (): Tweet | undefined => {
      if (!cached) return undefined;
      const { _cachedAt: _, ...tweetData } = cached;
      return tweetData as unknown as Tweet;
    };

    if (!preferFresh && cached) {
      log(`[TweetLoader] Using cached data for tweet ${id}`);
      return fromCache();
    }

    try {
      log(`[TweetLoader] Fetching fresh data for tweet ${id}`);
      const tweet = await getTweet(id);
      if (tweet) return tweet;
      log(`[TweetLoader] API returned no data for tweet ${id}`);
    } catch (error) {
      log(`[TweetLoader] API error for tweet ${id}:`, error);
    }

    if (cached) {
      log(`[TweetLoader] Falling back to cached data for tweet ${id}`);
      return fromCache();
    }
    return undefined;
  };
}
