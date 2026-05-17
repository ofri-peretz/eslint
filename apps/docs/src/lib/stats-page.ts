import fs from 'fs/promises';
import path from 'path';

import { unstable_cache } from 'next/cache';

import type { DevToArticle } from '@/lib/articles.types';
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
  npm: { totalDownloads: number; packageCount: number };
}

export interface PluginRow {
  /** Package name, e.g. `eslint-plugin-pg`. */
  name: string;
  category: PluginStat['category'];
  rules: number;
  version: string;
  /** Weekly npm downloads, 0 if the registry didn't return a number. */
  downloads: number;
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
      ? Number((((totals.reactions + totals.comments) / totals.reach) * 100).toFixed(2))
      : 0;
  return { ...totals, ratePercent };
}

/**
 * Fetch last-week npm downloads for every published plugin via the registry's
 * bulk endpoint. Cached for an hour; failures fall through to an empty map
 * so the page still renders (the chart owns the empty-state copy).
 */
const loadNpmDownloads = unstable_cache(
  async (packageNames: string[]): Promise<Record<string, number>> => {
    if (packageNames.length === 0) return {};
    try {
      const url = `https://api.npmjs.org/downloads/point/last-week/${packageNames.join(',')}`;
      const res = await fetch(url, { next: { revalidate: REVALIDATE } });
      if (!res.ok) return {};
      const json = (await res.json()) as
        | Record<string, { downloads: number | null } | null>
        | { downloads: number | null };
      const out: Record<string, number> = {};
      if ('downloads' in json && typeof json.downloads === 'number') {
        out[packageNames[0]!] = json.downloads;
        return out;
      }
      for (const [name, entry] of Object.entries(json as Record<string, { downloads: number | null } | null>)) {
        if (entry && typeof entry.downloads === 'number') {
          out[name] = entry.downloads;
        }
      }
      return out;
    } catch {
      return {};
    }
  },
  ['npm-downloads-weekly'],
  { revalidate: REVALIDATE, tags: ['stats', 'npm'] },
);

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
        const list = (await contribRes.json()) as Array<{ contributions?: number }>;
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
  const [pluginStats, coverage, engagement, github] = await Promise.all([
    loadPluginStats(),
    loadCoverageStats(),
    loadEngagement(),
    loadGithubRepoStats(),
  ]);

  const publishedPlugins = (pluginStats?.plugins ?? []).filter((p) => p.published);
  const downloads = await loadNpmDownloads(publishedPlugins.map((p) => p.name));
  const coverageMap = buildCoverageMap(coverage);

  const plugins: PluginRow[] = publishedPlugins
    .map((p) => ({
      name: p.name,
      category: p.category,
      rules: p.rules,
      version: p.version,
      downloads: downloads[p.name] ?? 0,
      coverage: coverageMap.get(p.name) ?? null,
    }))
    .sort((a, b) => b.downloads - a.downloads);

  const totalDownloads = plugins.reduce((sum, p) => sum + p.downloads, 0);

  const impact: ImpactStats = {
    engagement,
    github,
    npm: {
      totalDownloads,
      packageCount: pluginStats?.allPluginsCount ?? publishedPlugins.length,
    },
  };

  return {
    impact,
    plugins,
    catalogGeneratedAt: pluginStats?.generatedAt ?? new Date().toISOString(),
    liveFetchedAt: new Date().toISOString(),
  };
}
