import fs from 'fs/promises';
import path from 'path';

import { unstable_cache } from 'next/cache';

import type { DevToArticle } from '@/lib/articles.types';
import {
  loadEcosystemDownloads,
  loadPackageDownloads,
} from '@/lib/impact-source';
import {
  loadCoverageStats,
  loadPluginStats,
  type PluginStat,
} from '@/lib/stats-loader';

/**
 * Engagement is the North Star Metric for /stats. It has two honest faces:
 *   - Reach: total people touched (views).
 *   - Rate:  (reactions + comments) / views — fraction who acted on what
 *            they read. Multiplied by 100 to express as a percentage.
 * Showing both separates magnitude from quality; the prior "sum of views +
 * reactions + comments" was dominated by views and meaningless.
 */
export interface Engagement {
  reach: number;
  ratePercent: number;
  reactions: number;
  comments: number;
}

export interface ImpactStats {
  engagement: Engagement;
  github: {
    totalStars: number;
    totalForks: number;
    totalContributions: number;
  };
  /**
   * Downloads are cumulative across the whole counted ecosystem, read from
   * Supabase — never recomputed here. `since` is the measured start of that
   * window; null means unmeasured, and the UI must then omit the qualifier
   * rather than imply a start date.
   */
  npm: {
    /**
     * null when the canonical source was unreachable at build time. The UI
     * omits the metric rather than rendering 0 — this figure is published on
     * ofriperetz.dev too, and a confident zero is worse than a gap.
     */
    totalDownloads: number | null;
    packageCount: number | null;
    since: string | null;
  };
  /**
   * Audience reach — shown as context, never summed into any headline.
   * `null` means the source was unavailable at build; the UI hides the stat
   * rather than render a wrong/zero number.
   */
  audience: { devtoFollowers: number | null; githubFollowers: number | null };
}

export interface PluginRow {
  /** Package name, e.g. `eslint-plugin-postgresql-security`. */
  name: string;
  category: PluginStat['category'];
  rules: number;
  version: string;
  /** Cumulative npm downloads for this package, from the same source as the
   * ecosystem total above — so the rows always sum to the headline. */
  downloads: number | null;
  /** Line coverage 0–100, null if the plugin isn't in the coverage report. */
  coverage: number | null;
}

export interface StatsPageData {
  impact: ImpactStats;
  plugins: PluginRow[];
  /** When the static catalog (plugin-stats.json) was generated. */
  catalogGeneratedAt: string;
  /** When the live (npm + GitHub) fetches were resolved at build time. */
  liveFetchedAt: string;
}

const REVALIDATE = 3600;

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ofri-peretz';
const GITHUB_REPO = process.env.GITHUB_REPO || 'eslint';

function dataDir(): string {
  return path.join(process.cwd(), 'src/data');
}

async function readJSON<T>(file: string): Promise<T | null> {
  try {
    const content = await fs.readFile(path.join(dataDir(), file), 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function loadEngagement(): Promise<Engagement> {
  const data = await readJSON<{ articles: DevToArticle[] }>('articles.json');
  if (!data?.articles?.length) {
    return { reach: 0, ratePercent: 0, reactions: 0, comments: 0 };
  }
  const totals = data.articles.reduce(
    (acc, a) => ({
      reach: acc.reach + (a.page_views_count ?? 0),
      reactions: acc.reactions + (a.positive_reactions_count ?? 0),
      comments: acc.comments + (a.comments_count ?? 0),
    }),
    { reach: 0, reactions: 0, comments: 0 },
  );
  const ratePercent =
    totals.reach > 0
      ? Number(
          (((totals.reactions + totals.comments) / totals.reach) * 100).toFixed(
            2,
          ),
        )
      : 0;
  return { ...totals, ratePercent };
}

/**
 * Fetch repo-level GitHub numbers: stars, forks, and the sum of recorded
 * contributor commits. Anonymous (no token) so we hit the unauthenticated
 * rate limit — fine at build time, cached for an hour.
 */
const loadGithubRepoStats = unstable_cache(
  async (): Promise<ImpactStats['github']> => {
    const fallback = { totalStars: 0, totalForks: 0, totalContributions: 0 };
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      };
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      const repoRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
        { headers, next: { revalidate: REVALIDATE } },
      );
      if (!repoRes.ok) return fallback;
      const repo = (await repoRes.json()) as {
        stargazers_count?: number;
        forks_count?: number;
      };

      const contribRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors?per_page=100&anon=true`,
        { headers, next: { revalidate: REVALIDATE } },
      );
      let totalContributions = 0;
      if (contribRes.ok) {
        const list = (await contribRes.json()) as Array<{
          contributions?: number;
        }>;
        if (Array.isArray(list)) {
          totalContributions = list.reduce(
            (sum, c) => sum + (c.contributions ?? 0),
            0,
          );
        }
      }

      return {
        totalStars: repo.stargazers_count ?? 0,
        totalForks: repo.forks_count ?? 0,
        totalContributions,
      };
    } catch {
      return fallback;
    }
  },
  ['github-repo-stats'],
  { revalidate: REVALIDATE, tags: ['stats', 'github'] },
);

/**
 * Audience reach: GitHub user followers (live API) + dev.to followers (the
 * canonical Supabase-backed number, read from the blog's public stats API so
 * /stats and the blog scorecard agree). Either side falls back to `null` so a
 * transient failure hides the stat rather than showing a wrong number. Shown
 * as context only — never summed into engagement or any headline.
 */
const loadAudienceFollowers = unstable_cache(
  async (): Promise<ImpactStats['audience']> => {
    let githubFollowers: number | null = null;
    let devtoFollowers: number | null = null;

    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      };
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      const res = await fetch(`https://api.github.com/users/${GITHUB_OWNER}`, {
        headers,
        next: { revalidate: REVALIDATE },
      });
      if (res.ok) {
        const user = (await res.json()) as { followers?: number };
        if (typeof user.followers === 'number')
          githubFollowers = user.followers;
      }
    } catch {
      // leave null — UI hides the stat
    }

    try {
      const res = await fetch('https://ofriperetz.dev/api/homepage-stats', {
        next: { revalidate: REVALIDATE },
      });
      if (res.ok) {
        const json = (await res.json()) as { devto?: { followers?: number } };
        if (typeof json.devto?.followers === 'number') {
          devtoFollowers = json.devto.followers;
        }
      }
    } catch {
      // leave null — UI hides the stat
    }

    return { devtoFollowers, githubFollowers };
  },
  ['audience-followers'],
  { revalidate: REVALIDATE, tags: ['stats', 'audience'] },
);

/**
 * Build a (package-name → line-coverage %) lookup from the static coverage
 * snapshot so the plugins table can show a per-row coverage cell without
 * each row re-scanning the array.
 */
function buildCoverageMap(
  coverage: Awaited<ReturnType<typeof loadCoverageStats>>,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!coverage) return map;
  for (const tier of [coverage.plugins.security, coverage.plugins.quality]) {
    for (const entry of tier) {
      map.set(entry.name, entry.coverage);
    }
  }
  return map;
}

/**
 * Aggregate every input the `/stats` page renders. Live numbers (npm + GitHub)
 * are fetched server-side and cached for {@link REVALIDATE} seconds; static
 * inputs (plugin-stats, coverage, articles) come from committed JSON in
 * `src/data/`.
 */
export async function getStatsPageData(): Promise<StatsPageData> {
  const [pluginStats, coverage, engagement, github, audience] =
    await Promise.all([
      loadPluginStats(),
      loadCoverageStats(),
      loadEngagement(),
      loadGithubRepoStats(),
      loadAudienceFollowers(),
    ]);

  const publishedPlugins = (pluginStats?.plugins ?? []).filter(
    (p) => p.published,
  );
  // /stats is prerendered, so an unreachable source must not fail the build —
  // this repo is public and CI builds without Supabase credentials at all.
  // Degrade the metric, never the page, and never by substituting a different
  // metric: that is what this change exists to stop.
  const [ecosystem, downloads] = await Promise.all([
    loadEcosystemDownloads().catch((err: unknown) => {
      console.error('[stats-page] ecosystem downloads unavailable:', err);
      return null;
    }),
    loadPackageDownloads().catch((err: unknown) => {
      console.error('[stats-page] per-package downloads unavailable:', err);
      // null, never {}: an empty map renders as a 0 in every row — a data
      // gap displayed as a fact. null lets each cell render an honest em
      // dash instead (same contract as the coverage column).
      return null;
    }),
  ]);
  const coverageMap = buildCoverageMap(coverage);

  const plugins: PluginRow[] = publishedPlugins
    .map((p) => ({
      name: p.name,
      category: p.category,
      rules: p.rules,
      version: p.version,
      downloads: downloads ? (downloads[p.name] ?? 0) : null,
      coverage: coverageMap.get(p.name) ?? null,
    }))
    .sort((a, b) => (b.downloads ?? -1) - (a.downloads ?? -1));

  // The headline is the ecosystem figure as published, NOT a sum of the rows
  // above: the rows are the plugins this site documents, while the counted
  // ecosystem also includes packages that have no docs page. Summing the rows
  // would quietly publish a smaller number than ofriperetz.dev for the same
  // metric — the divergence this whole change exists to remove.
  const impact: ImpactStats = {
    engagement,
    github,
    npm: {
      totalDownloads: ecosystem?.total ?? null,
      packageCount: ecosystem?.packages ?? null,
      since: ecosystem?.since ?? null,
    },
    audience,
  };

  return {
    impact,
    plugins,
    catalogGeneratedAt: pluginStats?.generatedAt ?? new Date().toISOString(),
    liveFetchedAt: new Date().toISOString(),
  };
}
