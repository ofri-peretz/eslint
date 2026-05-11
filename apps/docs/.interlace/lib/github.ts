/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * GitHub raw content fetcher.
 *
 * Generic primitive for pulling markdown / JSON / any text from a GitHub repo
 * at runtime, with Next.js ISR revalidation. Site-specific wrappers (e.g. an
 * ESLint plugin README fetcher with plugin slug → repo mapping) compose on top
 * of this in the consumer.
 */

export interface GitHubContentOptions {
  owner: string;
  repo: string;
  /** Path inside the repo, e.g. 'README.md' or 'docs/rules/no-foo.md' */
  path: string;
  /** Defaults to 'main' */
  branch?: string;
  /** Override default ISR revalidation (1 hour). Set 0 to disable cache. */
  revalidate?: number;
  /** Extra cache tags for on-demand revalidation */
  tags?: string[];
}

const DEFAULT_BRANCH = 'main';
const DEFAULT_REVALIDATE = 3600;

/**
 * Fetch raw text content from a public GitHub repo.
 *
 * Returns null on any failure (404, network error, etc.) — never throws.
 * The null-on-failure contract makes this safe to use in render paths.
 */
export async function fetchGitHubContent(
  options: GitHubContentOptions,
): Promise<string | null> {
  const {
    owner,
    repo,
    path,
    branch = DEFAULT_BRANCH,
    revalidate = DEFAULT_REVALIDATE,
    tags,
  } = options;

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const baseTags = [`github-${repo}`, `github-${repo}-${path.replace(/\//g, '-')}`];

  try {
    const response = await fetch(url, {
      next: {
        revalidate,
        tags: [...baseTags, ...(tags ?? [])],
      },
    });

    if (!response.ok) {
      console.warn(`[interlace] fetchGitHubContent: ${url} → ${response.status}`);
      return null;
    }

    return response.text();
  } catch (error) {
    console.error(`[interlace] fetchGitHubContent error for ${url}:`, error);
    return null;
  }
}
