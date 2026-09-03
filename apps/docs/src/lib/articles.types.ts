/**
 * Dev.to Article Types
 * Shared type definitions for the Articles feature
 */

/** Dev.to Article interface */
export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image?: string;
  published_at: string;
  reading_time_minutes: number;
  positive_reactions_count: number;
  comments_count: number;
  page_views_count?: number;
  tag_list: string[];
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

/** Cached articles data structure */
export interface CachedArticlesData {
  articles: DevToArticle[];
  total: number;
  lastUpdated: string;
  source: 'authenticated' | 'public';
}

/** Sort field options */
export type SortField = 'date' | 'reactions' | 'comments' | 'reading_time';

/** Sort direction options */
export type SortDirection = 'asc' | 'desc';
