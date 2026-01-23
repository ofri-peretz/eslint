import { useQuery } from '@tanstack/react-query';

/**
 * Summary metrics from Codecov for a repository.
 */
export interface CodecovTotals {
  /** Number of files tracked */
  files: number;
  /** Total number of lines */
  lines: number;
  /** Number of lines hit by tests */
  hits: number;
  /** Number of lines missed by tests */
  misses: number;
  /** Coverage percentage (0-100) */
  coverage: number;
}

/**
 * Metadata for a Codecov repository.
 */
export interface CodecovRepo {
  /** Totals object containing coverage metrics */
  totals: CodecovTotals;
  /** Name of the repository */
  name: string;
}

/**
 * Coverage data for a specific component within a repository.
 */
export interface CodecovComponent {
  /** Technical identifier for the component */
  component_id: string;
  /** Human-readable name of the component */
  name: string;
  /** Coverage percentage for this specific component */
  coverage: number;
}

/**
 * Metadata for a Dev.to article.
 */
export interface DevToArticle {
  /** Unique Dev.to article ID */
  id: number;
  /** Article title */
  title: string;
  /** Brief article description */
  description: string;
  /** Canonical URL for the article */
  url: string;
  /** Cover image URL */
  cover_image: string | null;
  /** Social sharing image URL */
  social_image: string | null;
  /** ISO timestamp of publication */
  published_at: string;
  /** Estimated reading time in minutes */
  reading_time_minutes: number;
  /** Total positive reaction count */
  positive_reactions_count: number;
  /** Total comment count */
  comments_count: number;
  /** Page view count (if authenticated) */
  page_views_count?: number;
  /** List of tags associated with the article */
  tag_list: string[];
  /** Author information */
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

/**
 * Structured changelog entry parsed from raw markdown.
 */
export interface ChangelogEntry {
  /** SemVer version number */
  version: string;
  /** Date of release */
  date: string;
  /** Optional release title */
  title?: string;
  /** Raw markdown content of the entry */
  content: string;
  /** Associated tags (e.g., 'breaking', 'security') */
  tags: string[];
}

/**
 * Metadata for a single plugin.
 */
export interface PluginRecord {
  /** Full package name (e.g., eslint-plugin-pg) */
  name: string;
  /** Total number of rules provided by the plugin */
  rules: number;
  /** Plugin description */
  description: string;
  /** Technical category (security, framework, etc.) */
  category: string;
  /** Current published version */
  version: string;
  /** Whether the plugin is currently published */
  published: boolean;
}

/**
 * Global ecosystem statistics for all plugins.
 */
export interface PluginStats {
  /** Array of individual plugin metadata */
  plugins: {
    /** Full package name (e.g., eslint-plugin-pg) */
    name: string;
    /** Total number of rules provided by the plugin */
    rules: number;
    /** Plugin description */
    description: string;
    /** Technical category (security, framework, etc.) */
    category: string;
    /** Current published version */
    version: string;
    /** Whether the plugin is currently published */
    published: boolean;
  }[];
  /** Sum of all rules across all plugins */
  totalRules: number;
  /** Count of currently published plugins */
  totalPlugins: number;
  /** Total count of plugins including those in the pipeline */
  allPluginsCount: number;
  /** ISO timestamp of when stats were generated */
  generatedAt: string;
}

/**
 * Regex-validated path for a CHANGELOG.md file.
 */
export type ChangelogPath = `${string}CHANGELOG.md`;

/**
 * Universal fetcher with basic error handling.
 * 
 * @param url - The resource URL to fetch
 * @param options - Standard RequestInit options
 * @returns Parsed JSON or raw text depending on Content-Type
 */
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.warn(`[API NOTICE] ${response.status} ${response.statusText} for ${url}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch') {
      console.warn(`[NETWORK NOTICE] Could not reach ${url}. This might be a CORS issue or network availability.`);
    } else {
      console.warn(`[API NOTICE] for ${url}:`, error);
    }
    throw error;
  }
}

/**
 * Global cache constant for high-latency or static data (24 hours).
 */
export const CACHE_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Core API services for the Interlace Ecosystem.
 */
export const api = {
  /**
   * Codecov integration services.
   */
  codecov: {
    /**
     * Fetch repository summary statistics (coverage, files, hits, etc.).
     * Proxied via /api/stats to handle authentication.
     */
    getRepo: () => fetcher<CodecovRepo>('/api/stats'),
    /**
     * Fetch coverage breakdown by component (Core, Plugins, Utils).
     * Proxied via /api/stats/components.
     */
    getComponents: () => fetcher<CodecovComponent[]>('/api/stats/components'),
  },
  /**
   * Dev.to article discovery services.
   */
  devto: {
    /**
     * Fetch published articles for the ecosystem author.
     * Supports plugin-specific relevance filtering via query params.
     * 
     * @param plugin - Plugin name for filtering (optional)
     * @param limit - Maximum articles to return
     */
    getArticles: (plugin: string, limit: number) => 
      fetcher<{ articles: DevToArticle[] }>(`/api/devto-articles?plugin=${plugin}&limit=${limit}`)
        .then(data => (data.articles || []).map(article => ({
          ...article,
          tag_list: article.tag_list.filter(tag => tag.toLowerCase() !== 'eslint')
        }))),
    
    /**
     * Fetch unique tags across all ecosystem articles.
     * Useful for building navigation or filtering UI.
     */
    getTags: async (): Promise<string[]> => {
      const articles = await api.devto.getArticles('', 100);
      const tags = new Set<string>();
      articles.forEach(a => a.tag_list.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
    },
  },
  /**
   * GitHub raw content services.
   */
  github: {
    /**
     * Fetch raw file content directly from GitHub's raw CDN.
     * 
     * @param repo - Repository owner/name (e.g., 'ofri-peretz/eslint')
     * @param path - Relative path to the file
     */
    getRawFile: (repo: string, path: string) => 
      fetcher<string>(`https://raw.githubusercontent.com/${repo}/main/${path}`),
    /**
     * Fetch raw CHANGELOG.md content for a specific package.
     * 
     * @param repo - Repository identifier
     * @param path - Path ensuring it ends with CHANGELOG.md
     */
    getChangelog: (repo: string, path: ChangelogPath) => 
      api.github.getRawFile(repo, path),
  },
  /**
   * Ecosystem-wide statistics services.
   */
  stats: {
    /**
     * Fetch the centralized plugin statistics (synced daily).
     * Used for rule counts, versions, and pipeline status.
     */
    getPluginStats: () => fetcher<PluginStats>('/api/plugin-stats'),
  }
};

// --- React Query Hooks ---

/**
 * Hook to retrieve repository-level coverage and file metrics.
 */
export function useCodecovRepo() {
  return useQuery({
    queryKey: ['codecov-repo'],
    queryFn: api.codecov.getRepo,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to retrieve per-component coverage data.
 */
export function useCodecovComponents() {
  return useQuery({
    queryKey: ['codecov-components'],
    queryFn: api.codecov.getComponents,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook to retrieve relevant Dev.to articles based on site context.
 * 
 * @param plugin - Filter articles by plugin relevance
 * @param limit - Maximum results
 */
export function useDevToArticles(plugin: string = '', limit: number = 100) {
  return useQuery({
    queryKey: ['devto-articles', plugin, limit],
    queryFn: () => api.devto.getArticles(plugin, limit),
    staleTime: CACHE_STALE_TIME,
  });
}

/**
 * Hook to retrieve list of unique tags from all articles.
 */
export function useDevToTags() {
  return useQuery({
    queryKey: ['devto-tags'],
    queryFn: api.devto.getTags,
    staleTime: CACHE_STALE_TIME,
  });
}

/**
 * Hook to fetch and cache a raw CHANGELOG.md file from GitHub.
 * 
 * @param repo - GitHub repository identifier
 * @param path - Path to the changelog file
 */
export function useGitHubChangelog(repo: string, path: ChangelogPath) {
  return useQuery({
    queryKey: ['github-changelog', repo, path],
    queryFn: () => api.github.getChangelog(repo, path),
    staleTime: CACHE_STALE_TIME,
  });
}

/**
 * Hook to fetch and cache a raw roadmap or strategic file from GitHub.
 * 
 * @param repo - GitHub repository identifier
 * @param path - Path to the markdown file
 */
export function useGitHubRoadmap(repo: string, path: string = 'ROADMAP.md') {
  return useQuery({
    queryKey: ['github-roadmap', repo, path],
    queryFn: () => api.github.getRawFile(repo, path),
    staleTime: CACHE_STALE_TIME,
  });
}

/**
 * Hook to retrieve global ecosystem stats (rule counts, plugin counts).
 */
export function usePluginStats() {
  return useQuery({
    queryKey: ['plugin-stats'],
    queryFn: api.stats.getPluginStats,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Specialized hook to get info for a specific plugin using React Query's select feature.
 * This ensures the component only re-renders when its specific plugin data changes.
 * 
 * @param pluginName - Slug or full name of the plugin
 */
/**
 * Specialized hook to get info for a specific plugin using React Query's select feature.
 * This ensures the component only re-renders when its specific plugin data changes.
 * 
 * @param pluginName - Slug or full name of the plugin
 */
export function usePluginInfo(pluginName: string) {
  return useQuery<PluginStats, Error, PluginRecord | undefined>({
    queryKey: ['plugin-stats'],
    queryFn: api.stats.getPluginStats,
    select: (data) => data.plugins.find(p => 
      p.name === pluginName || 
      p.name === `eslint-plugin-${pluginName}` ||
      p.name.replace('eslint-plugin-', '') === pluginName
    ),
    staleTime: 1000 * 60 * 60,
  });
}
