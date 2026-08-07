#!/usr/bin/env -S npx tsx
/**
 * Lighthouse Report
 *
 * Renders the weekly Lighthouse run into markdown for the job summary and,
 * when a budget breaks, the body of the tracking issue.
 *
 * The cron has no PR to comment on, so the run is only as useful as what it
 * writes down. Reading four category scores per URL out of raw `lhr-*.json`
 * in the Actions log is not a report — this is.
 *
 * Reads `.lighthouseci/lhr-<timestamp>.json`, which `lhci collect` always
 * writes, rather than `manifest.json`, which only the `filesystem` upload
 * target writes — our config uploads to `temporary-public-storage`, so the
 * manifest is never there. Sourcing the scores from the manifest would have
 * produced an empty report every week while still exiting 0.
 *
 * Run: tsx scripts/lighthouse-report.ts [--dir .lighthouseci] [--out report.md]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/** The subset of a Lighthouse result this report reads. */
export interface Lhr {
  requestedUrl?: string;
  finalUrl?: string;
  categories?: Record<string, { score: number | null }>;
}

/** One assertion lhci evaluated. Only the failures are written to disk. */
export interface AssertionResult {
  name: string;
  auditId?: string;
  url?: string;
  expected?: number;
  actual?: number;
  operator?: string;
  passed: boolean;
  level?: string;
}

/** Scores for one URL, aggregated across that URL's runs. */
export interface UrlScores {
  url: string;
  runs: number;
  summary: Record<string, number>;
}

const CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
] as const;

/** Score out of 1 → percentage, or `—` when the category wasn't collected. */
function pct(score: number | undefined): string {
  return score === undefined ? '—' : `${Math.round(score * 100)}`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Milliseconds for timing audits, raw for unitless ones (CLS, byte counts).
 *
 * lhci reports every numeric budget in the audit's own unit and puts no unit
 * in the result, so the audit id is the only thing that says which.
 */
function formatValue(auditId: string | undefined, value: number): string {
  if (auditId === 'cumulative-layout-shift') return value.toFixed(3);
  if (auditId === 'unused-javascript') return `${Math.round(value / 1024)} KB`;
  if (auditId?.startsWith('categories:')) return value.toFixed(2);
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

/** Strip the localhost origin so the table reads as routes, not URLs. */
function routeOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * Collapse the per-run LHRs into one row per URL.
 *
 * `numberOfRuns: 3` means three LHRs per URL; the median is what lhci itself
 * treats as representative, and it is the honest number to publish — a mean
 * lets one cold-start run drag the whole week's score down.
 */
export function aggregate(lhrs: Lhr[]): UrlScores[] {
  const byUrl = new Map<string, Lhr[]>();
  for (const lhr of lhrs) {
    const url = lhr.requestedUrl ?? lhr.finalUrl;
    if (!url) continue;
    byUrl.set(url, [...(byUrl.get(url) ?? []), lhr]);
  }

  return [...byUrl.entries()].map(([url, runs]) => {
    const summary: Record<string, number> = {};
    for (const category of CATEGORIES) {
      const scores = runs
        .map((r) => r.categories?.[category]?.score)
        .filter((s): s is number => typeof s === 'number');
      if (scores.length) summary[category] = median(scores);
    }
    return { url, runs: runs.length, summary };
  });
}

/**
 * The markdown report.
 *
 * Pure so the shape can be asserted without running Lighthouse — the failure
 * this guards against is a silent one (an empty or malformed report still
 * exits 0 and nobody reads the run until the next breach).
 */
export function renderReport(
  scores: UrlScores[],
  assertions: AssertionResult[],
  meta: { sha?: string; runUrl?: string; date?: string } = {},
): string {
  const lines: string[] = [];
  const failures = assertions.filter((a) => !a.passed);
  const errors = failures.filter((a) => a.level !== 'warn');
  const warnings = failures.filter((a) => a.level === 'warn');

  lines.push('## Web Vitals Budget — weekly report');
  lines.push('');

  if (scores.length === 0) {
    lines.push(
      '> **No Lighthouse results were produced.** The collect step failed ' +
        'before writing any `lhr-*.json`; the budget was not evaluated. ' +
        'This is a broken run, not a passing one.',
    );
    lines.push('');
    return lines.join('\n');
  }

  const verdict = errors.length
    ? `❌ **${errors.length} budget${errors.length === 1 ? '' : 's'} breached**`
    : '✅ **All budgets met**';
  lines.push(
    `${verdict}${warnings.length ? ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`,
  );
  lines.push('');

  // Category scores: the hard gate, one row per URL.
  lines.push('### Scores');
  lines.push('');
  lines.push('| Route | Perf | A11y | Best practices | SEO |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const entry of scores) {
    const cells = CATEGORIES.map((c) => pct(entry.summary[c]));
    lines.push(`| \`${routeOf(entry.url)}\` | ${cells.join(' | ')} |`);
  }
  lines.push('');
  const runCounts = [...new Set(scores.map((s) => s.runs))];
  lines.push(
    `<sub>Median of ${runCounts.length === 1 ? runCounts[0] : runCounts.join('/')} run(s) per route.</sub>`,
  );
  lines.push('');

  if (failures.length) {
    lines.push('### Budgets not met');
    lines.push('');
    lines.push('| Level | Audit | Route | Budget | Measured |');
    lines.push('| --- | --- | --- | ---: | ---: |');
    for (const a of [...errors, ...warnings]) {
      const icon = a.level === 'warn' ? '⚠️ warn' : '❌ error';
      const budget =
        a.expected === undefined ? '—' : formatValue(a.auditId, a.expected);
      const measured =
        a.actual === undefined ? '—' : formatValue(a.auditId, a.actual);
      lines.push(
        `| ${icon} | \`${a.auditId ?? a.name}\` | \`${a.url ? routeOf(a.url) : '—'}\` | ${budget} | ${measured} |`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  const footer: string[] = [];
  if (meta.date) footer.push(`Run ${meta.date}`);
  if (meta.sha) footer.push(`commit \`${meta.sha.slice(0, 7)}\``);
  if (meta.runUrl) footer.push(`[full logs & HTML reports](${meta.runUrl})`);
  footer.push('budgets live in `apps/docs/lighthouserc.json`');
  lines.push(footer.join(' · '));
  lines.push('');

  return lines.join('\n');
}

/** Read a JSON file, or the fallback when it is absent or unparseable. */
function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Every LHR `lhci collect` wrote, in the order the filenames sort. */
export function loadLhrs(dir: string): Lhr[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^lhr-\d+\.json$/.test(f))
    .sort()
    .map((f) => readJson<Lhr | null>(join(dir, f), null))
    .filter((l): l is Lhr => l !== null);
}

function main(): void {
  const args = process.argv.slice(2);
  const argOf = (flag: string, fallback: string): string => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
  };

  const dir = argOf('--dir', '.lighthouseci');
  const out = argOf('--out', '');

  const scores = aggregate(loadLhrs(dir));
  const assertions = readJson<AssertionResult[]>(
    join(dir, 'assertion-results.json'),
    [],
  );

  const report = renderReport(scores, assertions, {
    sha: process.env.GITHUB_SHA,
    runUrl:
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined,
    date: new Date().toISOString().slice(0, 10),
  });

  if (out) writeFileSync(out, report);
  process.stdout.write(report);
}

// Only run as a CLI, so the pure renderer above stays importable from tests.
if (process.argv[1]?.endsWith('lighthouse-report.ts')) main();
