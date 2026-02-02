/**
 * DEV.to Article Loader with Cache Fallback
 * 
 * Fetches article data from DEV.to API with caching to prevent rate limits
 * Similar pattern to tweet-loader.ts
 */

import cachedArticlesData from '@/data/cached-devto-articles.json';

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  readable_publish_date: string;
  slug: string;
  path: string;
  url: string;
  cover_image: string | null;
  social_image: string;
  created_at: string;
  published_at: string;
  tag_list: string;
  tags: string[];
  user: {
    name: string;
    username: string;
    twitter_username: string | null;
    github_username: string | null;
    profile_image: string;
    profile_image_90: string;
  };
  organization?: {
    name: string;
    username: string;
    slug: string;
    profile_image: string;
    profile_image_90: string;
  };
  reading_time_minutes: number;
  public_reactions_count: number;
  comments_count: number;
  _cachedAt?: string;
}

interface CachedArticlesData {
  articles: Record<string, DevToArticle>;
  _lastUpdated: string | null;
}

const cachedArticles = cachedArticlesData as unknown as CachedArticlesData;

/**
 * Get DEV.to article by URL path (e.g., "devteam/top-7-featured-dev-posts-of-the-week-e8p")
 */
export async function getDevToArticle(
  path: string,
  options: {
    preferFresh?: boolean;
    debug?: boolean;
  } = {}
): Promise<DevToArticle | undefined> {
  const {
    preferFresh = process.env.NODE_ENV === 'development',
    debug = false
  } = options;

  const log = debug ? console.log : () => {};
  
  // Normalize path - remove leading slash if present
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Get cached article if available
  const cachedArticle = cachedArticles.articles[normalizedPath];
  
  // In production builds, prefer cache to avoid rate limits
  if (!preferFresh && cachedArticle) {
    log(`[DevToLoader] Using cached data for article ${normalizedPath}`);
    const { _cachedAt: _, ...articleData } = cachedArticle;
    return articleData as DevToArticle;
  }
  
  // Try to fetch fresh data
  try {
    log(`[DevToLoader] Fetching fresh data for article ${normalizedPath}`);
    
    // DEV.to API endpoint - get article by path
    const response = await fetch(`https://dev.to/api/articles/${normalizedPath}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`DEV.to API returned ${response.status}`);
    }
    
    const article = await response.json() as DevToArticle;
    
    if (article) {
      log(`[DevToLoader] Successfully fetched article: ${article.title}`);
      return article;
    }
    
    log(`[DevToLoader] API returned no data for article ${normalizedPath}`);
  } catch (error) {
    log(`[DevToLoader] API error for article ${normalizedPath}:`, error);
  }
  
  // Fall back to cache
  if (cachedArticle) {
    log(`[DevToLoader] Falling back to cached data for article ${normalizedPath}`);
    const { _cachedAt: _, ...articleData } = cachedArticle;
    return articleData as DevToArticle;
  }
  
  log(`[DevToLoader] No data available for article ${normalizedPath}`);
  return undefined;
}

/**
 * Get all cached article paths
 */
export function getCachedArticlePaths(): string[] {
  return Object.keys(cachedArticles.articles);
}
