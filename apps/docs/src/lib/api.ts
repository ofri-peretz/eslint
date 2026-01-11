import { useQuery } from '@tanstack/react-query';

export interface CodecovTotals {
  files: number;
  lines: number;
  hits: number;
  misses: number;
  coverage: number;
}

export interface CodecovRepo {
  totals: CodecovTotals;
  name: string;
}

export interface CodecovComponent {
  component_id: string;
  name: string;
  coverage: number;
}

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string | null;
  social_image: string;
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

export interface ChangelogEntry {
  version: string;
  date: string;
  title?: string;
  content: string;
  tags: string[];
}

export interface PluginStats {
  plugins: {
    name: string;
    rules: number;
    description: string;
    category: string;
    version: string;
  }[];
  totalRules: number;
  totalPlugins: number;
  generatedAt: string;
}

export type ChangelogPath = `${string}CHANGELOG.md`;

/**
 * Universal fetcher with basic error handling
 */
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`[API ERROR] ${response.status} ${response.statusText} for ${url}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch') {
      console.error(`[NETWORK ERROR] Could not reach ${url}. This might be a CORS issue or network availability.`, error);
    } else {
      console.error(`[API UNKNOWN ERROR] for ${url}:`, error);
    }
    throw error;
  }
}

/**
 * Cache constants - 24 hour staleTime for all data
 */
export const CACHE_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export const api = {
  codecov: {
    getRepo: () => fetcher<CodecovRepo>('/api/stats'),
    getComponents: () => fetcher<CodecovComponent[]>('/api/stats/components'),
  },
  devto: {
    /**
     * Fetch articles with optional plugin filter
     */
    getArticles: (plugin: string, limit: number) => 
      fetcher<{ articles: DevToArticle[] }>(`/api/devto-articles?plugin=${plugin}&limit=${limit}`)
        .then(data => data.articles || []),
    
    /**
     * Fetch all unique tags from articles (cached)
     * Call once and share across components
     */
    getTags: async (): Promise<string[]> => {
      const articles = await api.devto.getArticles('', 100);
      const tags = new Set<string>();
      articles.forEach(a => a.tag_list.forEach(t => {
        if (t.toLowerCase() !== 'eslint') tags.add(t);
      }));
      return Array.from(tags).sort();
    },
  },
  github: {
    getChangelog: (repo: string, path: ChangelogPath) => 
      fetcher<string>(`https://raw.githubusercontent.com/${repo}/main/${path}`),
  },
  stats: {
    getPluginStats: () => fetcher<PluginStats>('/api/plugin-stats'),
  }
};

// --- React Query Hooks ---

export function useCodecovRepo() {
  return useQuery({
    queryKey: ['codecov-repo'],
    queryFn: api.codecov.getRepo,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCodecovComponents() {
  return useQuery({
    queryKey: ['codecov-components'],
    queryFn: api.codecov.getComponents,
    staleTime: 1000 * 60 * 60,
  });
}

export function useDevToArticles(plugin: string = '', limit: number = 100) {
  return useQuery({
    queryKey: ['devto-articles', plugin, limit],
    queryFn: () => api.devto.getArticles(plugin, limit),
    staleTime: CACHE_STALE_TIME,
  });
}

export function useDevToTags() {
  return useQuery({
    queryKey: ['devto-tags'],
    queryFn: api.devto.getTags,
    staleTime: CACHE_STALE_TIME,
  });
}

export function useGitHubChangelog(repo: string, path: ChangelogPath) {
  return useQuery({
    queryKey: ['github-changelog', repo, path],
    queryFn: () => api.github.getChangelog(repo, path),
    staleTime: CACHE_STALE_TIME,
  });
}

export function usePluginStats() {
  return useQuery({
    queryKey: ['plugin-stats'],
    queryFn: api.stats.getPluginStats,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

