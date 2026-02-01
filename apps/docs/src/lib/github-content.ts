/**
 * GitHub Content Fetcher
 *
 * Fetches documentation content from GitHub repositories at runtime.
 * Supports ISR (Incremental Static Regeneration) with configurable revalidation.
 */

export interface GitHubContentOptions {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
}

export interface PluginContentOptions {
  slug: string;
  contentType: 'readme' | 'changelog' | 'rule';
  ruleName?: string;
}

// Map plugin slugs to GitHub repository names
const PLUGIN_REPOS: Record<string, string> = {
  'browser-security': 'eslint-plugin-browser-security',
  crypto: 'eslint-plugin-crypto',
  jwt: 'eslint-plugin-jwt',
  'secure-coding': 'eslint-plugin-secure-coding',
  'graphql-security': 'eslint-plugin-graphql-security',
  'api-security': 'eslint-plugin-api-security',
  'mongodb-security': 'eslint-plugin-mongodb-security',
  secrets: 'eslint-plugin-secrets',
  'react-best-practices': 'eslint-plugin-react-best-practices',
  'react-hooks': 'eslint-plugin-react-hooks-best-practices',
  'react-performance': 'eslint-plugin-react-performance',
  documentation: 'eslint-plugin-documentation',
  'naming-conventions': 'eslint-plugin-naming-conventions',
  'coding-conventions': 'eslint-plugin-coding-conventions',
  errors: 'eslint-plugin-errors',
  'module-federation': 'eslint-plugin-module-federation',
};

const GITHUB_OWNER = 'interlace-app';
const DEFAULT_BRANCH = 'main';

/**
 * Fetch raw content from GitHub
 */
export async function fetchGitHubContent(
  options: GitHubContentOptions
): Promise<string | null> {
  const { owner, repo, path, branch = DEFAULT_BRANCH } = options;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 3600, // ISR: revalidate every hour
        tags: [`github-${repo}`, `github-${repo}-${path.replace(/\//g, '-')}`],
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return response.text();
  } catch (error) {
    console.error(`Error fetching GitHub content: ${error}`);
    return null;
  }
}

/**
 * Fetch plugin content (README, changelog, or rule docs)
 */
export async function fetchPluginContent(
  options: PluginContentOptions
): Promise<string | null> {
  const { slug, contentType, ruleName } = options;
  const repo = PLUGIN_REPOS[slug];

  if (!repo) {
    console.warn(`Unknown plugin slug: ${slug}`);
    return null;
  }

  let path: string;
  switch (contentType) {
    case 'readme':
      path = 'README.md';
      break;
    case 'changelog':
      path = 'CHANGELOG.md';
      break;
    case 'rule':
      if (!ruleName) {
        console.warn(`Rule name required for rule content`);
        return null;
      }
      path = `docs/rules/${ruleName}.md`;
      break;
    default:
      return null;
  }

  return fetchGitHubContent({
    owner: GITHUB_OWNER,
    repo,
    path,
  });
}

/**
 * Get list of all plugins with their metadata
 */
export function getAllPlugins() {
  return Object.entries(PLUGIN_REPOS).map(([slug, repo]) => ({
    slug,
    repo,
    name: repo.replace('eslint-plugin-', ''),
    category: getPluginCategory(slug),
  }));
}

/**
 * Get plugin category (security or quality)
 */
function getPluginCategory(
  slug: string
): 'security' | 'quality' | 'getting-started' {
  const securityPlugins = [
    'browser-security',
    'crypto',
    'jwt',
    'secure-coding',
    'graphql-security',
    'api-security',
    'mongodb-security',
    'secrets',
  ];

  return securityPlugins.includes(slug) ? 'security' : 'quality';
}

/**
 * Fetch aggregated changelog for all plugins
 */
export async function fetchAggregatedChangelog(): Promise<
  Array<{ plugin: string; content: string }>
> {
  const plugins = getAllPlugins();
  const changelogs = await Promise.all(
    plugins.map(async (plugin) => {
      const content = await fetchPluginContent({
        slug: plugin.slug,
        contentType: 'changelog',
      });
      return content ? { plugin: plugin.slug, content } : null;
    })
  );

  return changelogs.filter(Boolean) as Array<{
    plugin: string;
    content: string;
  }>;
}
