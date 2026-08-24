/**
 * GitHub Changelog API Route
 *
 * Fetches CHANGELOG.md files from GitHub with caching.
 * Uses json-cache policy for 2-hour TTL on changelog data.
 */

import { NextResponse } from 'next/server';
import { PLUGINS } from '@/lib/plugins';
import changelogData from '@/data/changelog.json';

/**
 * `<package>@<version>` → release facts, from the build-time changelog data.
 *
 * The parser below reads dates out of the version heading. Changesets writes
 * `## 1.4.1` with no date at all, so from the day this repo adopted changesets
 * every entry this endpoint returned carried `"date": "Unknown"` — a
 * documented public field that has never once held a date for a modern
 * release. The real date is the release's git tag, which
 * `apps/docs/scripts/sync-changelog.ts` already resolves for every version.
 *
 * `kind` comes from the changeset's conventional-commit prefix, which is what
 * the author declared. The keyword guess below (`content.includes('fix')`)
 * fires on any entry whose prose happens to contain the word.
 */
const RELEASE_FACTS = new Map(
  (
    changelogData.releases as Array<{
      package: string;
      version: string;
      date: string | null;
      entries: Array<{ kind: string }>;
    }>
  ).map((r) => [`${r.package}@${r.version}`, r]),
);

/** Our `kind` vocabulary → the `type` values this endpoint has always used. */
const KIND_TO_TYPE: Record<string, ChangelogEntry['type']> = {
  breaking: 'breaking',
  security: 'security',
  fix: 'fix',
  perf: 'perf',
  feature: 'feature',
};

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ofri-peretz';
const GITHUB_REPO = process.env.GITHUB_REPO || 'eslint';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Cache TTL: 2 hours (matches changelog*.json pattern in json-cache.ts)
const CHANGELOG_TTL = 7200;

// Plugin paths in the monorepo. Derived from the canonical registry at
// `src/lib/plugins.ts` so this map can never drift from the actual packages
// shipped under `packages/`. Adding a plugin = appending to the registry.
const PLUGIN_PATHS: Record<string, string> = Object.fromEntries(
  PLUGINS.map((p) => [p.slug, `packages/${p.package}`]),
);

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'fix' | 'breaking' | 'security' | 'perf';
  content: string;
}

interface PluginChangelog {
  plugin: string;
  path: string;
  raw: string;
  entries: ChangelogEntry[];
  fetchedAt: string;
}

/**
 * Parse a CHANGELOG.md into structured entries
 */
function parseChangelog(raw: string, packageName?: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Match version headers like: ## [1.2.3] - 2026-01-15 or ## 1.2.3 (2026-01-15)
  const versionRegex =
    /^##\s*\[?(\d+\.\d+\.\d+)\]?\s*[-–(]?\s*(\d{4}-\d{2}-\d{2})?/gm;
  const sections = raw.split(versionRegex);

  for (let i = 1; i < sections.length; i += 3) {
    const version = sections[i];
    const content = sections[i + 2]?.trim() || '';
    const facts = packageName
      ? RELEASE_FACTS.get(`${packageName}@${version}`)
      : undefined;

    // Heading date first (legacy sections have one), then the git tag, then
    // the honest admission. Only the middle case is new — it is what turns
    // "Unknown" into a date for every changesets-era release.
    const date = sections[i + 1] || facts?.date || 'Unknown';

    // Prefer the declared kind; fall back to the keyword guess. `other` is not
    // a `type` this endpoint has ever returned, so it falls through too.
    const declared = facts?.entries
      .map((e) => KIND_TO_TYPE[e.kind])
      .find(Boolean);

    let type: ChangelogEntry['type'] = declared ?? 'feature';
    if (!declared) {
      const lower = content.toLowerCase();
      if (lower.includes('breaking')) type = 'breaking';
      else if (lower.includes('security') || lower.includes('vulnerability'))
        type = 'security';
      else if (lower.includes('fix') || lower.includes('bug')) type = 'fix';
      else if (lower.includes('perf') || lower.includes('faster'))
        type = 'perf';
    }

    entries.push({ version, date, type, content });
  }

  return entries.slice(0, 10); // Return last 10 versions
}

/**
 * Fetch a single plugin's changelog from GitHub.
 *
 * Pre-condition: `plugin` MUST be a key of PLUGIN_PATHS — enforced at the API
 * boundary in GET(). This keeps log statements below safe from request-driven
 * log-injection (CodeQL: "Log injection" / "Use of externally-controlled
 * format string"), since the value can only be one of our hard-coded slugs.
 */
async function fetchPluginChangelog(
  plugin: string,
): Promise<PluginChangelog | null> {
  const path = PLUGIN_PATHS[plugin];
  if (!path) return null;

  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}/CHANGELOG.md`;

  try {
    const response = await fetch(url, {
      next: { revalidate: CHANGELOG_TTL },
      headers: { Accept: 'text/plain' },
    });

    if (!response.ok) {
      // `JSON.stringify(plugin)` quotes the value as a JSON literal — CR/LF in
      // the input would be encoded as `\r` / `\n` rather than terminating the
      // log line. `plugin` is also restricted to PLUGIN_PATHS keys at the API
      // boundary, but the explicit sanitizer is what CodeQL's `js/log-injection`
      // query recognizes.
      console.warn(
        '[Changelog] No CHANGELOG.md for',
        JSON.stringify(plugin),
        'status',
        response.status,
      );
      return null;
    }

    const raw = await response.text();
    // `path` is `packages/<dir>`; the data is keyed by the package's *name*,
    // which for every plugin equals that directory name.
    const entries = parseChangelog(raw, path.replace(/^packages\//, ''));

    return {
      plugin,
      path: `${path}/CHANGELOG.md`,
      raw,
      entries,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    // `JSON.stringify(plugin)` is the sanitizer CodeQL's `js/log-injection`
    // query recognizes — CR/LF in the value would be encoded rather than
    // terminating the log line. `plugin` is also restricted to PLUGIN_PATHS
    // keys at the API boundary above, so this is defense-in-depth.
    console.error('[Changelog] Failed to fetch', JSON.stringify(plugin), error);
    return null;
  }
}

/**
 * GET /api/changelog
 *
 * Query params:
 * - plugin: Specific plugin name (optional, returns all if not specified)
 * - raw: If "true", returns raw markdown (default: parsed entries)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pluginFilter = searchParams.get('plugin');
  const includeRaw = searchParams.get('raw') === 'true';

  // Validate the plugin filter against the allow-list BEFORE anything reaches
  // `fetch`, `console.warn`, or `NextResponse.json`. Without this gate, a
  // crafted `?plugin=<crlf-injection>` value would taint downstream logs
  // (CodeQL: "Log injection"). With it, every code path below treats `plugin`
  // as one of our hard-coded slugs.
  if (pluginFilter !== null && !(pluginFilter in PLUGIN_PATHS)) {
    return NextResponse.json(
      { success: false, error: 'Unknown plugin' },
      { status: 400 },
    );
  }

  try {
    if (pluginFilter) {
      // Fetch single plugin
      const changelog = await fetchPluginChangelog(pluginFilter);

      if (!changelog) {
        return NextResponse.json(
          {
            success: false,
            error: `Changelog not found for plugin: ${pluginFilter}`,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: includeRaw ? changelog : { ...changelog, raw: undefined },
        meta: {
          source: 'github',
          ttl: CHANGELOG_TTL,
          fetchedAt: changelog.fetchedAt,
        },
      });
    }

    // Fetch all plugins
    const plugins = Object.keys(PLUGIN_PATHS);
    const results = await Promise.all(
      plugins.map((plugin) => fetchPluginChangelog(plugin)),
    );

    const changelogs = results.filter(Boolean) as PluginChangelog[];

    return NextResponse.json({
      success: true,
      data: changelogs.map((c) => (includeRaw ? c : { ...c, raw: undefined })),
      meta: {
        source: 'github',
        ttl: CHANGELOG_TTL,
        fetchedAt: new Date().toISOString(),
        pluginCount: changelogs.length,
      },
    });
  } catch (error) {
    console.error('[Changelog API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch changelog data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
