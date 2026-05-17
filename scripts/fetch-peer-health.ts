#!/usr/bin/env -S npx tsx
/**
 * fetch-peer-health — capture maintenance-health metrics for the peer
 * ESLint plugins named in `distribution/ECOSYSTEM_LANDSCAPE.md`.
 *
 * Closes the §9 (Adoption & maintenance health) `(gap)` rows in
 * `distribution/EVALUATION_METRICS.md`:
 *
 *   - Weekly npm downloads (peer-comparable)
 *   - GitHub stars
 *   - Days since last release
 *   - Release cadence (median interval, 12-month window)
 *   - Open-issue count
 *   - Contributor count (90-day distinct authors)
 *
 * Sources:
 *   - npm registry — `npm view <pkg> --json` (no auth required)
 *   - GitHub API — `gh api repos/<owner>/<repo>` (uses caller's gh auth)
 *
 * Designed to be runnable locally (gh auth optional — degrades gracefully)
 * and in CI nightly via .github/workflows/peer-health.yml.
 *
 * Output:
 *   benchmark-results/peer-health.json   — structured data
 *   benchmark-results/peer-health.md     — human-readable table
 *
 * Usage:
 *   npm run peer-health
 *   npm run peer-health -- --no-github   # skip gh api calls
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const OUT_DIR = path.join(REPO_ROOT, 'benchmark-results');

/**
 * The peer plugins we track. Mirrors the canonical neighbor list in
 * `distribution/ECOSYSTEM_LANDSCAPE.md` and the allowlist in
 * `apps/docs/src/__tests__/plugin-name-drift.test.ts`. When a new peer
 * is added to either of those, add it here too.
 *
 * `gh` is `owner/repo` for the GitHub API. Some plugins live in a
 * monorepo whose top-level repo we don't want to query (e.g. the
 * react team's monorepo); for those we set `gh: null` and skip the
 * GitHub metrics.
 */
interface Peer {
  npm: string;
  gh: string | null;
  category: 'security' | 'general' | 'react' | 'imports' | 'typescript' | 'engine-stock';
}

export const PEERS: Peer[] = [
  // Security
  { npm: 'eslint-plugin-security', gh: 'eslint-community/eslint-plugin-security', category: 'security' },
  { npm: 'eslint-plugin-no-secrets', gh: 'nickdeis/eslint-plugin-no-secrets', category: 'security' },
  { npm: 'eslint-plugin-no-unsanitized', gh: 'mozilla/eslint-plugin-no-unsanitized', category: 'security' },
  { npm: 'eslint-plugin-sonarjs', gh: 'SonarSource/eslint-plugin-sonarjs', category: 'security' },
  // General-purpose
  { npm: 'eslint-plugin-unicorn', gh: 'sindresorhus/eslint-plugin-unicorn', category: 'general' },
  { npm: 'eslint-plugin-n', gh: 'eslint-community/eslint-plugin-n', category: 'general' },
  { npm: 'eslint-plugin-promise', gh: 'eslint-community/eslint-plugin-promise', category: 'general' },
  { npm: 'eslint-plugin-perfectionist', gh: 'azat-io/eslint-plugin-perfectionist', category: 'general' },
  // React
  { npm: 'eslint-plugin-react', gh: 'jsx-eslint/eslint-plugin-react', category: 'react' },
  { npm: 'eslint-plugin-react-hooks', gh: null, category: 'react' },
  { npm: 'eslint-plugin-jsx-a11y', gh: 'jsx-eslint/eslint-plugin-jsx-a11y', category: 'react' },
  // Imports
  { npm: 'eslint-plugin-import', gh: 'import-js/eslint-plugin-import', category: 'imports' },
  { npm: 'eslint-plugin-unused-imports', gh: 'sweepline/eslint-plugin-unused-imports', category: 'imports' },
  { npm: 'eslint-plugin-simple-import-sort', gh: 'lydell/eslint-plugin-simple-import-sort', category: 'imports' },
  // TypeScript
  { npm: '@typescript-eslint/eslint-plugin', gh: 'typescript-eslint/typescript-eslint', category: 'typescript' },
  // Engines that ship stock corpora — track release cadence so we know
  // when to re-audit OXLINT_STOCK_OVERLAP.md / BIOME_STOCK_OVERLAP.md.
  { npm: 'oxlint', gh: 'oxc-project/oxc', category: 'engine-stock' },
  { npm: '@biomejs/biome', gh: 'biomejs/biome', category: 'engine-stock' },
];

interface NpmInfo {
  weeklyDownloads: number | null;
  latestVersion: string | null;
  releaseCount12mo: number | null;
  medianReleaseIntervalDays: number | null;
  daysSinceLastRelease: number | null;
  license: string | null;
}

interface GhInfo {
  stars: number | null;
  openIssues: number | null;
  contributors90d: number | null;
  defaultBranch: string | null;
  /**
   * Median hours between issue open and first maintainer (= repo
   * owner / contributor / collaborator) comment, sampled over the most
   * recent N closed-or-open issues. Null when we couldn't gather a
   * sample (e.g. peer with no issue tracker, repo set to private API).
   */
  medianTimeToFirstResponseHours: number | null;
  /** Number of issues sampled to compute the median. */
  ttfrSampleSize: number;
}

interface PeerHealth extends Peer {
  npm_: NpmInfo;
  gh_: GhInfo;
  fetchedAt: string;
  errors: string[];
}

interface CliArgs {
  noGithub: boolean;
}

function parseArgs(): CliArgs {
  return {
    noGithub: process.argv.includes('--no-github'),
  };
}

function safeExec(cmd: string, args: string[]): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) return { ok: false, out: '', err: r.stderr || `exit ${r.status}` };
  return { ok: true, out: r.stdout, err: '' };
}

/**
 * Fetch weekly download count for a package from the npm-stat / npm
 * downloads API. The shape we use:
 *   https://api.npmjs.org/downloads/point/last-week/<pkg>
 *
 * We avoid `npm view` for downloads because the registry doesn't expose
 * download counts in `npm view`. Using fetch keeps the dep set zero.
 */
async function fetchWeeklyDownloads(pkg: string): Promise<number | null> {
  try {
    const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as { downloads?: number };
    return typeof j.downloads === 'number' ? j.downloads : null;
  } catch {
    return null;
  }
}

/**
 * Extract release cadence and last-release date from `npm view <pkg> time --json`
 * which returns a map of version -> ISO-8601 timestamp.
 */
function parseReleaseCadence(times: Record<string, string>): {
  releaseCount12mo: number;
  medianReleaseIntervalDays: number;
  daysSinceLastRelease: number;
} {
  // Drop the synthetic 'created' / 'modified' entries; keep only versions.
  const versionEntries = Object.entries(times)
    .filter(([k]) => k !== 'created' && k !== 'modified')
    .map(([v, t]) => ({ version: v, t: new Date(t).getTime() }))
    .sort((a, b) => a.t - b.t);

  if (versionEntries.length === 0) {
    return { releaseCount12mo: 0, medianReleaseIntervalDays: 0, daysSinceLastRelease: 9999 };
  }

  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const recent = versionEntries.filter((e) => e.t >= oneYearAgo);

  const intervals: number[] = [];
  for (let i = 1; i < versionEntries.length; i++) {
    const dt = versionEntries[i].t - versionEntries[i - 1].t;
    intervals.push(dt / (1000 * 60 * 60 * 24));
  }
  intervals.sort((a, b) => a - b);
  const median = intervals.length > 0 ? intervals[Math.floor(intervals.length / 2)] : 0;

  const latestT = versionEntries[versionEntries.length - 1].t;
  const daysSince = Math.floor((now - latestT) / (1000 * 60 * 60 * 24));

  return {
    releaseCount12mo: recent.length,
    medianReleaseIntervalDays: Math.round(median * 10) / 10,
    daysSinceLastRelease: daysSince,
  };
}

async function fetchNpm(peer: Peer): Promise<{ info: NpmInfo; errors: string[] }> {
  const errors: string[] = [];
  let weeklyDownloads: number | null = null;
  let latestVersion: string | null = null;
  let releaseCount12mo: number | null = null;
  let medianReleaseIntervalDays: number | null = null;
  let daysSinceLastRelease: number | null = null;
  let license: string | null = null;

  weeklyDownloads = await fetchWeeklyDownloads(peer.npm);

  const r = safeExec('npm', ['view', peer.npm, 'version', 'license', 'time', '--json']);
  if (!r.ok) {
    errors.push(`npm view failed: ${r.err.trim().slice(0, 200)}`);
    return {
      info: {
        weeklyDownloads,
        latestVersion,
        releaseCount12mo,
        medianReleaseIntervalDays,
        daysSinceLastRelease,
        license,
      },
      errors,
    };
  }
  try {
    const j = JSON.parse(r.out);
    latestVersion = typeof j.version === 'string' ? j.version : null;
    license = typeof j.license === 'string' ? j.license : null;
    if (j.time && typeof j.time === 'object') {
      const cadence = parseReleaseCadence(j.time as Record<string, string>);
      releaseCount12mo = cadence.releaseCount12mo;
      medianReleaseIntervalDays = cadence.medianReleaseIntervalDays;
      daysSinceLastRelease = cadence.daysSinceLastRelease;
    }
  } catch (e) {
    errors.push(`npm JSON parse failed: ${(e as Error).message}`);
  }
  return {
    info: {
      weeklyDownloads,
      latestVersion,
      releaseCount12mo,
      medianReleaseIntervalDays,
      daysSinceLastRelease,
      license,
    },
    errors,
  };
}

/**
 * Median time-to-first-response in hours, sampled across up to N recent
 * issues. The "first response" is the first comment authored by someone
 * with one of these `author_association` values:
 *   MEMBER, OWNER, COLLABORATOR, CONTRIBUTOR.
 * That excludes drive-by comments from non-maintainers, which is the
 * signal a buyer cares about (will a maintainer respond?).
 *
 * We cap at the most recent 30 issues per peer to keep within typical
 * GitHub-Actions rate limits when running across ~17 peers nightly.
 */
function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function fetchTimeToFirstResponse(
  ghRepo: string,
  sampleLimit = 30,
): { hours: number | null; sampleSize: number; error?: string } {
  // List recent issues (not PRs). GitHub conflates PRs into the issues
  // endpoint; filter by absence of `pull_request`. State=all so we cover
  // closed responded-to issues too.
  const listR = safeExec('gh', [
    'api',
    `repos/${ghRepo}/issues?state=all&per_page=${sampleLimit}&sort=created&direction=desc`,
  ]);
  if (!listR.ok) return { hours: null, sampleSize: 0, error: `gh issues list failed: ${listR.err.trim().slice(0, 200)}` };
  let issues: Array<{
    number?: number;
    created_at?: string;
    pull_request?: unknown;
    comments?: number;
  }>;
  try {
    issues = JSON.parse(listR.out);
  } catch (e) {
    return { hours: null, sampleSize: 0, error: `gh issues JSON parse failed: ${(e as Error).message}` };
  }
  const samples: number[] = [];
  for (const issue of issues) {
    if (issue.pull_request) continue;
    if (typeof issue.number !== 'number') continue;
    if (typeof issue.created_at !== 'string') continue;
    if (issue.comments === 0) continue; // never responded; skip rather than penalize with infinity
    // Fetch first page of comments; need only the first qualifying one.
    const cR = safeExec('gh', [
      'api',
      `repos/${ghRepo}/issues/${issue.number}/comments?per_page=10`,
    ]);
    if (!cR.ok) continue;
    let comments: Array<{ created_at?: string; author_association?: string }>;
    try {
      comments = JSON.parse(cR.out);
    } catch {
      continue;
    }
    const firstMaintainer = comments.find(
      (c) =>
        c.author_association === 'OWNER' ||
        c.author_association === 'MEMBER' ||
        c.author_association === 'COLLABORATOR' ||
        c.author_association === 'CONTRIBUTOR',
    );
    if (!firstMaintainer?.created_at) continue;
    const opened = new Date(issue.created_at).getTime();
    const replied = new Date(firstMaintainer.created_at).getTime();
    if (Number.isNaN(opened) || Number.isNaN(replied) || replied < opened) continue;
    samples.push((replied - opened) / (1000 * 60 * 60));
  }
  if (samples.length === 0) return { hours: null, sampleSize: 0 };
  return { hours: Math.round(median(samples) * 10) / 10, sampleSize: samples.length };
}

async function fetchGh(peer: Peer, skip: boolean): Promise<{ info: GhInfo; errors: string[] }> {
  const errors: string[] = [];
  let stars: number | null = null;
  let openIssues: number | null = null;
  let contributors90d: number | null = null;
  let defaultBranch: string | null = null;
  let medianTimeToFirstResponseHours: number | null = null;
  let ttfrSampleSize = 0;

  if (skip || !peer.gh) {
    return {
      info: { stars, openIssues, contributors90d, defaultBranch, medianTimeToFirstResponseHours, ttfrSampleSize },
      errors,
    };
  }

  // Repo-level metadata.
  const repoR = safeExec('gh', ['api', `repos/${peer.gh}`]);
  if (!repoR.ok) {
    errors.push(`gh api repos failed: ${repoR.err.trim().slice(0, 200)}`);
  } else {
    try {
      const j = JSON.parse(repoR.out);
      stars = typeof j.stargazers_count === 'number' ? j.stargazers_count : null;
      openIssues = typeof j.open_issues_count === 'number' ? j.open_issues_count : null;
      defaultBranch = typeof j.default_branch === 'string' ? j.default_branch : null;
    } catch (e) {
      errors.push(`gh JSON parse failed: ${(e as Error).message}`);
    }
  }

  // Contributors active in last 90 days — paginate participation /
  // stats/contributors. We use the cheaper 'commits' endpoint with a
  // since= filter.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const commitsR = safeExec('gh', [
    'api',
    `repos/${peer.gh}/commits?per_page=100&since=${encodeURIComponent(since)}`,
  ]);
  if (commitsR.ok) {
    try {
      const j = JSON.parse(commitsR.out) as Array<{ author?: { login?: string } | null }>;
      const authors = new Set<string>();
      for (const c of j) {
        const login = c.author?.login;
        if (login) authors.add(login);
      }
      contributors90d = authors.size;
    } catch (e) {
      errors.push(`gh commits parse failed: ${(e as Error).message}`);
    }
  } else {
    errors.push(`gh api commits failed: ${commitsR.err.trim().slice(0, 200)}`);
  }

  // Time-to-first-response — sampled separately because it costs N+1
  // API calls per peer. Skipped automatically when `gh auth status`
  // fails earlier.
  const ttfr = fetchTimeToFirstResponse(peer.gh);
  medianTimeToFirstResponseHours = ttfr.hours;
  ttfrSampleSize = ttfr.sampleSize;
  if (ttfr.error) errors.push(ttfr.error);

  return {
    info: { stars, openIssues, contributors90d, defaultBranch, medianTimeToFirstResponseHours, ttfrSampleSize },
    errors,
  };
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ghAvailable = !args.noGithub && (() => {
    try {
      execSync('gh auth status', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })();

  const fetchedAt = new Date().toISOString();
  const results: PeerHealth[] = [];

  for (const peer of PEERS) {
    // eslint-disable-next-line no-console
    console.log(`Fetching ${peer.npm} …`);
    const npm = await fetchNpm(peer);
    const gh = await fetchGh(peer, !ghAvailable);
    results.push({
      ...peer,
      npm_: npm.info,
      gh_: gh.info,
      fetchedAt,
      errors: [...npm.errors, ...gh.errors],
    });
  }

  const summary = {
    generatedAt: fetchedAt,
    ghAvailable,
    totalPeers: results.length,
    successfulFetches: results.filter((r) => r.errors.length === 0).length,
    peers: results,
  };

  const jsonPath = path.join(OUT_DIR, 'peer-health.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const mdPath = path.join(OUT_DIR, 'peer-health.md');
  fs.writeFileSync(mdPath, renderMarkdown(summary));

  // eslint-disable-next-line no-console
  console.log(`Wrote ${jsonPath} and ${mdPath}`);
  // eslint-disable-next-line no-console
  console.log(
    `Successful fetches: ${summary.successfulFetches}/${summary.totalPeers}; ` +
      `GitHub auth available: ${ghAvailable}`,
  );
}

function renderMarkdown(summary: {
  generatedAt: string;
  ghAvailable: boolean;
  totalPeers: number;
  successfulFetches: number;
  peers: PeerHealth[];
}): string {
  const lines: string[] = [];
  lines.push('# Peer-plugin health snapshot');
  lines.push('');
  lines.push(`> Generated by \`npm run peer-health\` at ${summary.generatedAt}.`);
  lines.push(
    `> GitHub API auth available: ${summary.ghAvailable}. Successful fetches: ${summary.successfulFetches}/${summary.totalPeers}.`,
  );
  // `>` continuation keeps both paragraphs inside a single blockquote;
  // a blank line here splits them into two, which markdownlint flags as
  // MD028 (no-blanks-blockquote).
  lines.push('>');
  lines.push(
    '> Source data: npm registry (downloads, releases, license) + GitHub API (stars, open issues, 90-day contributors).',
  );
  lines.push('');
  lines.push(
    '| Package | Category | Weekly downloads | Latest | Releases (12mo) | Median interval | Days since release | Stars | Open issues | Contributors (90d) | Median TTFR (h) | License |',
  );
  lines.push(
    '| :--- | :--- | ---: | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |',
  );

  for (const p of summary.peers) {
    const wd = p.npm_.weeklyDownloads;
    const wdFmt = wd === null ? '—' : wd >= 1_000_000 ? `${(wd / 1_000_000).toFixed(1)}M` : wd >= 1_000 ? `${(wd / 1_000).toFixed(0)}k` : wd.toString();
    const ttfr =
      p.gh_.medianTimeToFirstResponseHours === null
        ? '—'
        : `${p.gh_.medianTimeToFirstResponseHours}h (n=${p.gh_.ttfrSampleSize})`;
    lines.push(
      `| \`${p.npm}\` | ${p.category} | ${wdFmt} | ${p.npm_.latestVersion ?? '—'} | ${p.npm_.releaseCount12mo ?? '—'} | ${p.npm_.medianReleaseIntervalDays ?? '—'}d | ${p.npm_.daysSinceLastRelease ?? '—'} | ${p.gh_.stars ?? '—'} | ${p.gh_.openIssues ?? '—'} | ${p.gh_.contributors90d ?? '—'} | ${ttfr} | ${p.npm_.license ?? '—'} |`,
    );
  }

  lines.push('');
  lines.push('## How this maps to evaluation metrics');
  lines.push('');
  lines.push('All §9 (Adoption & maintenance health) rows in `distribution/EVALUATION_METRICS.md`:');
  lines.push('');
  lines.push('- **Weekly npm downloads** — `Weekly downloads` column.');
  lines.push('- **GitHub stars** — `Stars` column.');
  lines.push('- **Days since last release** — `Days since release` column.');
  lines.push('- **Release cadence** — `Median interval` column (days between releases).');
  lines.push('- **Open-issue count** — `Open issues` column.');
  lines.push('- **Contributor count (90-day)** — `Contributors (90d)` column.');
  lines.push('- **Time-to-first-response** — `Median TTFR (h)` column, sampled across up to 30 most recent issues per peer; counts only first comments by maintainers (`OWNER`/`MEMBER`/`COLLABORATOR`/`CONTRIBUTOR`).');
  lines.push('- **License** — `License` column.');
  lines.push('');
  return lines.join('\n');
}

// Run only if invoked directly, not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith('fetch-peer-health.ts')) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
