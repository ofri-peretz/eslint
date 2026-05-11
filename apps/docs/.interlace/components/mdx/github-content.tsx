/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * GitHubContent — Server Component that fetches and renders Markdown/MDX
 * content from a GitHub repo with cache-controlled `fetch`.
 *
 * Built for the ALL-REMOTE policy: per-package READMEs, CHANGELOGs, and
 * rule docs render directly from GitHub at request time, no redeploy needed
 * to ship a content update.
 *
 * Repo coordinates are required props or env vars — never hardcoded to a
 * specific Interlace repo. Each consuming site wires its own `repo`/`owner`
 * either inline or via `NEXT_PUBLIC_INTERLACE_GITHUB_REPO`.
 *
 * Usage:
 *   <GitHubContent
 *     owner="ofri-peretz"
 *     repo="eslint"
 *     path="packages/eslint-plugin-jwt/README.md"
 *   />
 *
 *   // Or with the type/plugin shortcut (consumer supplies the template map):
 *   <GitHubContent
 *     owner="ofri-peretz"
 *     repo="eslint"
 *     pathTemplate="packages/eslint-plugin-{plugin}/README.md"
 *     params={{ plugin: 'jwt' }}
 *   />
 */

const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export interface GitHubContentProps {
  /** GitHub owner (org or user). Falls back to NEXT_PUBLIC_INTERLACE_GITHUB_OWNER. */
  owner?: string;
  /** GitHub repo name. Falls back to NEXT_PUBLIC_INTERLACE_GITHUB_REPO. */
  repo?: string;
  /** Branch (default: NEXT_PUBLIC_INTERLACE_GITHUB_BRANCH or 'main'). */
  branch?: string;
  /** Direct path to file (relative to repo root). Wins over `pathTemplate`. */
  path?: string;
  /** Template like 'packages/{plugin}/README.md' — substituted with `params`. */
  pathTemplate?: string;
  /** Substitution map for `pathTemplate`. Values are interpolated into `{key}` slots. */
  params?: Record<string, string>;
  /** Cache TTL in seconds (default 3600). Sets `next.revalidate`. */
  ttl?: number;
  /** Container className passed to the rendered wrapper. */
  className?: string;
}

export interface FetchResult {
  content: string;
  source: string;
  fetchedAt: string;
  ttl: number;
}

function resolvePath(template: string, params: Record<string, string>): string {
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`{${key}}`, value);
  }
  return path;
}

function resolveCoordinates(props: GitHubContentProps) {
  const owner = props.owner ?? process.env.NEXT_PUBLIC_INTERLACE_GITHUB_OWNER;
  const repo = props.repo ?? process.env.NEXT_PUBLIC_INTERLACE_GITHUB_REPO;
  const branch =
    props.branch ?? process.env.NEXT_PUBLIC_INTERLACE_GITHUB_BRANCH ?? 'main';
  if (!owner || !repo) {
    throw new Error(
      '[GitHubContent] `owner` and `repo` must be provided as props or via ' +
        'NEXT_PUBLIC_INTERLACE_GITHUB_OWNER / NEXT_PUBLIC_INTERLACE_GITHUB_REPO.',
    );
  }
  return { owner, repo, branch };
}

export async function fetchGitHubContent(
  props: GitHubContentProps,
): Promise<FetchResult | null> {
  const { path: directPath, pathTemplate, params, ttl: customTTL } = props;

  let targetPath: string | null = null;
  if (directPath) {
    targetPath = directPath;
  } else if (pathTemplate) {
    targetPath = resolvePath(pathTemplate, params ?? {});
  }
  if (!targetPath) {
    console.error('[GitHubContent] `path` or `pathTemplate` is required.');
    return null;
  }

  const { owner, repo, branch } = resolveCoordinates(props);
  const ttl = customTTL ?? DEFAULT_TTL_SECONDS;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${targetPath}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: ttl },
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'Interlace-Docs/1.0',
      },
    });
    if (!response.ok) {
      console.warn(
        `[GitHubContent] Failed to fetch ${targetPath}: ${response.status}`,
      );
      return null;
    }
    return {
      content: await response.text(),
      source: targetPath,
      fetchedAt: new Date().toISOString(),
      ttl,
    };
  } catch (error) {
    console.error(`[GitHubContent] Error fetching ${targetPath}:`, error);
    return null;
  }
}

export async function GitHubContent(props: GitHubContentProps) {
  const { className = '' } = props;
  const result = await fetchGitHubContent(props);

  if (!result) {
    return (
      <div className={`github-content-error ${className}`}>
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <p className="text-sm text-fd-muted-foreground">
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
        <div className="whitespace-pre-wrap font-mono text-sm text-fd-foreground">
          {result.content}
        </div>
      </div>
      <div className="mt-4 text-xs text-fd-muted-foreground">
        <span>Source: {result.source}</span>
        <span className="mx-2">•</span>
        <span>Cached for {Math.round(result.ttl / 60)} minutes</span>
      </div>
    </div>
  );
}

export default GitHubContent;
