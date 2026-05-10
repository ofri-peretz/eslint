#!/usr/bin/env tsx
/**
 * ESLint Version Download Stats
 *
 * Fetches per-version download counts for the `eslint` package from the npm
 * registry and aggregates them by major version. Used to inform peerDependency
 * decisions across this monorepo (e.g. whether to add ESLint v10 support).
 *
 * Usage:
 *   npx tsx scripts/fetch-eslint-version-stats.ts                # table output
 *   npx tsx scripts/fetch-eslint-version-stats.ts --json         # machine-readable
 *   npx tsx scripts/fetch-eslint-version-stats.ts --package=eslint --out=benchmark-results/eslint-versions.json
 *
 * Data source: https://api.npmjs.org/versions/{package}/last-week
 * Note: npm's per-version endpoint only exposes a last-week window. Total
 * (all-version) counts are available for longer windows but cannot be split by
 * version, so this script intentionally sticks to last-week.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

interface NpmVersionsResponse {
  package: string;
  downloads: Record<string, number>;
}

interface MajorBucket {
  major: number;
  stable: number;
  prerelease: number;
  total: number;
  pct: number;
}

interface Report {
  package: string;
  period: 'last-week';
  fetchedAt: string;
  totalDownloads: number;
  byMajor: MajorBucket[];
  latestStable: string | null;
}

function parseArgs(argv: string[]): {
  pkg: string;
  json: boolean;
  out: string | null;
} {
  const args = { pkg: 'eslint', json: false, out: null as string | null };
  for (const a of argv.slice(2)) {
    if (a === '--json') args.json = true;
    else if (a.startsWith('--package=')) args.pkg = a.slice('--package='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(`Usage: fetch-eslint-version-stats [options]

Options:
  --package=<name>    npm package to query (default: eslint)
  --json              emit JSON instead of a human table
  --out=<path>        also write JSON report to this file
  -h, --help          show this help
`);
}

async function fetchDownloads(pkg: string): Promise<NpmVersionsResponse> {
  const url = `https://api.npmjs.org/versions/${encodeURIComponent(pkg)}/last-week`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`npm API returned ${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as NpmVersionsResponse;
}

async function fetchLatest(pkg: string): Promise<string | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { version?: string };
  return data.version ?? null;
}

function aggregate(downloads: Record<string, number>): {
  buckets: MajorBucket[];
  total: number;
} {
  const map = new Map<number, { stable: number; prerelease: number }>();
  let total = 0;
  for (const [version, count] of Object.entries(downloads)) {
    const majorStr = version.split('.')[0];
    const major = Number.parseInt(majorStr ?? '', 10);
    if (Number.isNaN(major)) continue;
    const isPrerelease = version.includes('-');
    const entry = map.get(major) ?? { stable: 0, prerelease: 0 };
    if (isPrerelease) entry.prerelease += count;
    else entry.stable += count;
    map.set(major, entry);
    total += count;
  }
  const buckets: MajorBucket[] = [...map.entries()]
    .map(([major, { stable, prerelease }]) => ({
      major,
      stable,
      prerelease,
      total: stable + prerelease,
      pct: 0,
    }))
    .sort((a, b) => b.total - a.total);
  for (const b of buckets) b.pct = total === 0 ? 0 : (b.total / total) * 100;
  return { buckets, total };
}

function renderTable(report: Report): string {
  const lines: string[] = [];
  lines.push(`Package:   ${report.package}`);
  lines.push(`Period:    ${report.period}`);
  lines.push(`Fetched:   ${report.fetchedAt}`);
  if (report.latestStable) lines.push(`Latest:    v${report.latestStable}`);
  lines.push(`Total:     ${report.totalDownloads.toLocaleString()} downloads`);
  lines.push('');
  lines.push('Major  Downloads        Share    Prerelease');
  lines.push('-----  ---------------  -------  ----------');
  for (const b of report.byMajor) {
    const major = `v${b.major}`.padEnd(5);
    const dl = b.total.toLocaleString().padStart(15);
    const pct = `${b.pct.toFixed(2)}%`.padStart(7);
    const pre = b.prerelease > 0 ? b.prerelease.toLocaleString() : '';
    lines.push(`${major}  ${dl}  ${pct}  ${pre}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const [data, latestStable] = await Promise.all([
    fetchDownloads(args.pkg),
    fetchLatest(args.pkg),
  ]);
  const { buckets, total } = aggregate(data.downloads);
  const report: Report = {
    package: data.package,
    period: 'last-week',
    fetchedAt: new Date().toISOString(),
    totalDownloads: total,
    byMajor: buckets,
    latestStable,
  };

  if (args.out) {
    const path = resolve(process.cwd(), args.out);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
    process.stderr.write(`Wrote ${path}\n`);
  }

  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else process.stdout.write(renderTable(report) + '\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
