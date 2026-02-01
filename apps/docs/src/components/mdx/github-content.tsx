/**
 * GitHubContent Component
 * 
 * Fetches and renders Markdown/MDX content from GitHub with caching.
 * Follows the ALL-REMOTE policy - no redeployment needed for content updates.
 * 
 * Usage:
 *   <GitHubContent 
 *     type="readme" 
 *     plugin="browser-security" 
 *   />
 *   
 *   <GitHubContent 
 *     type="changelog" 
 *     plugin="jwt"
 *   />
 *   
 *   <GitHubContent 
 *     path="packages/eslint-plugin-jwt/docs/rules/no-hardcoded-secret.md"
 *   />
 */

import { fetchCachedJSON, getTTLForPath } from '@/lib/json-cache';

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ofri-peretz';
const GITHUB_REPO = process.env.GITHUB_REPO || 'eslint';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Default TTLs for different content types (in seconds)
const CONTENT_TTL = {
  readme: 3600,      // 1 hour for READMEs
  changelog: 7200,   // 2 hours for changelogs
  rule: 21600,       // 6 hours for rule docs (less frequent changes)
  default: 3600,     // 1 hour default
} as const;

// Content type to path mapping
const CONTENT_PATHS = {
  readme: 'packages/eslint-plugin-{plugin}/README.md',
  changelog: 'packages/eslint-plugin-{plugin}/CHANGELOG.md',
  rule: 'packages/eslint-plugin-{plugin}/docs/rules/{rule}.md',
} as const;

export interface GitHubContentProps {
  /** Content type shortcut */
  type?: 'readme' | 'changelog' | 'rule';
  /** Plugin name (without eslint-plugin- prefix) */
  plugin?: string;
  /** Rule name for rule documentation */
  rule?: string;
  /** Direct path to file (overrides type/plugin) */
  path?: string;
  /** Custom TTL override in seconds */
  ttl?: number;
  /** Show loading skeleton */
  showLoading?: boolean;
  /** CSS class for the container */
  className?: string;
}

interface FetchResult {
  content: string;
  source: string;
  fetchedAt: string;
  ttl: number;
}

/**
 * Resolve template path with plugin/rule parameters
 */
function resolvePath(template: string, params: Record<string, string>): string {
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`{${key}}`, value);
  }
  return path;
}

/**
 * Fetch content from GitHub with caching
 */
export async function fetchGitHubContent(
  props: GitHubContentProps
): Promise<FetchResult | null> {
  const { type, plugin, rule, path: directPath, ttl: customTTL } = props;
  
  let targetPath: string;
  let contentTTL: number;
  
  if (directPath) {
    targetPath = directPath;
    contentTTL = customTTL ?? getTTLForPath(directPath);
  } else if (type && plugin) {
    const template = CONTENT_PATHS[type];
    targetPath = resolvePath(template, { plugin, rule: rule || '' });
    contentTTL = customTTL ?? CONTENT_TTL[type];
  } else {
    console.error('[GitHubContent] Either path or type+plugin is required');
    return null;
  }
  
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${targetPath}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: contentTTL },
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Interlace-Docs/1.0',
      },
    });
    
    if (!response.ok) {
      console.warn(`[GitHubContent] Failed to fetch ${targetPath}: ${response.status}`);
      return null;
    }
    
    const content = await response.text();
    
    return {
      content,
      source: targetPath,
      fetchedAt: new Date().toISOString(),
      ttl: contentTTL,
    };
  } catch (error) {
    console.error(`[GitHubContent] Error fetching ${targetPath}:`, error);
    return null;
  }
}

/**
 * Server Component that fetches and renders GitHub content
 */
export async function GitHubContent(props: GitHubContentProps) {
  const { className = '', showLoading = true } = props;
  
  const result = await fetchGitHubContent(props);
  
  if (!result) {
    return (
      <div className={`github-content-error ${className}`}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load content. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`github-content ${className}`}>
      <div 
        className="prose prose-neutral dark:prose-invert max-w-none"
        data-source={result.source}
        data-fetched-at={result.fetchedAt}
      >
        {/* 
          Note: This renders raw markdown. For full MDX support,
          integrate with @fumadocs/mdx-remote or similar.
          Currently outputs as a code block for safety.
        */}
        <div className="whitespace-pre-wrap font-mono text-sm">
          {result.content}
        </div>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        <span>Source: {result.source}</span>
        <span className="mx-2">•</span>
        <span>Cached for {result.ttl / 60} minutes</span>
      </div>
    </div>
  );
}

/**
 * Hook for client-side fetching (if needed)
 */
export function useGitHubContent(props: GitHubContentProps) {
  // This would use React Query for client-side fetching
  // For now, prefer the server component above
  throw new Error('useGitHubContent is not implemented. Use the GitHubContent server component instead.');
}

export default GitHubContent;
