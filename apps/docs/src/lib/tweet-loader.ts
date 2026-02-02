/**
 * Tweet Loader
 * 
 * Loads tweet data with a fallback to cached data.
 * This prevents "Tweet not found" errors when Twitter API is rate-limited
 * during Vercel builds.
 * 
 * Priority:
 * 1. Try to fetch fresh data from Twitter API
 * 2. If that fails, use cached data from cached-tweets.json
 * 3. If no cache exists, return undefined (shows "Tweet not found")
 */

import { getTweet, type Tweet } from 'react-tweet/api';
import cachedTweetsData from '@/data/cached-tweets.json';

// Use a relaxed type for the JSON data - the Tweet type has strict requirements
// that JSON serialization doesn't preserve (like tuple types)
interface CachedTweetsData {
  tweets: Record<string, Record<string, unknown> & { _cachedAt?: string }>;
  _lastUpdated: string | null;
}

const cachedTweets = cachedTweetsData as unknown as CachedTweetsData;

/**
 * Get tweet data with cache fallback
 * 
 * @param id - Tweet ID
 * @param options - Configuration options
 * @returns Tweet data or undefined if not found
 */
export async function getTweetWithCache(
  id: string,
  options: {
    /**
     * If true, always try API first even if cache exists.
     * If false, prefer cache to avoid rate limits.
     * Default: true in development, false in production builds
     */
    preferFresh?: boolean;
    /**
     * If true, log debug information
     */
    debug?: boolean;
  } = {}
): Promise<Tweet | undefined> {
  const { 
    preferFresh = process.env.NODE_ENV === 'development',
    debug = false 
  } = options;
  
  const log = debug ? console.log : () => {};
  
  // Get cached tweet if available
  const cachedTweet = cachedTweets.tweets[id];
  
  // In production builds, prefer cache to avoid rate limits
  if (!preferFresh && cachedTweet) {
    log(`[TweetLoader] Using cached data for tweet ${id}`);
    const { _cachedAt: _, ...tweetData } = cachedTweet;
    return tweetData as unknown as Tweet;
  }
  
  // Try to fetch fresh data
  try {
    log(`[TweetLoader] Fetching fresh data for tweet ${id}`);
    const tweet = await getTweet(id);
    
    if (tweet) {
      log(`[TweetLoader] Successfully fetched tweet ${id}`);
      return tweet;
    }
    
    // API returned undefined - tweet might be deleted
    log(`[TweetLoader] API returned no data for tweet ${id}`);
  } catch (error) {
    log(`[TweetLoader] API error for tweet ${id}:`, error);
  }
  
  // Fall back to cache
  if (cachedTweet) {
    log(`[TweetLoader] Falling back to cached data for tweet ${id}`);
    const { _cachedAt: _, ...tweetData } = cachedTweet;
    return tweetData as unknown as Tweet;
  }
  
  log(`[TweetLoader] No data available for tweet ${id}`);
  return undefined;
}

/**
 * Check if we have cached data for a tweet
 */
export function hasCachedTweet(id: string): boolean {
  return id in cachedTweets.tweets;
}

/**
 * Get cache metadata
 */
export function getCacheMetadata(): { lastUpdated: string | null; tweetCount: number } {
  return {
    lastUpdated: cachedTweets._lastUpdated,
    tweetCount: Object.keys(cachedTweets.tweets).length,
  };
}
