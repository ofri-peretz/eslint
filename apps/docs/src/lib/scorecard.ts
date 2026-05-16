/**
 * Scorecard data loader for /scorecard.
 *
 * Pure functions only — no React. The ground-truth lives in dated
 * `benchmarks/results/ilb-flagship/<date>.json` snapshots emitted by
 * `npm run ilb:flagship`. Locked by
 * `src/__tests__/scorecard-source-integrity.test.ts`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FLAGSHIP_RESULTS_DIR = resolve(
  process.cwd(),
  '../../benchmarks/results/ilb-flagship',
);

export const FLAGSHIP_RULES = [
  'import-next/no-cycle',
  'pg/no-unsafe-query',
  'secure-coding/no-hardcoded-credentials',
  'secure-coding/no-redos-vulnerable-regex',
  'mongodb-security/no-unsafe-query',
  'jwt/no-algorithm-none',
  'browser-security/no-postmessage-wildcard-origin',
  'react-features/hooks-exhaustive-deps',
  'react-a11y/alt-text',
  'vercel-ai-security/no-unsafe-output-handling',
] as const;

export type FlagshipRuleId = (typeof FLAGSHIP_RULES)[number];

const STACK_LABELS = {
  oursEslint: 'Ours (ESLint)',
  competitorEslint: 'Competitor (ESLint)',
  oxlintNative: 'oxlint native (competitor)',
} as const;

export type Stack = keyof typeof STACK_LABELS;
const STACKS = Object.keys(STACK_LABELS) as Stack[];

interface RawRun {
  cold?: { ms: number; findingsCount: number };
  warm?: { ms: number; findingsCount: number };
}

export interface FlagshipResultRow {
  rule: string;
  repo: string;
  starsK: number;
  tier: string;
  runs: Partial<Record<Stack, RawRun>>;
}

export interface FlagshipSnapshot {
  runAt: string;
  eslintVersion: string;
  oxlintVersion: string;
  nodeVersion: string;
  schema: string;
  filename: string;
  results: FlagshipResultRow[];
}

export interface StackMedian {
  stack: Stack;
  label: string;
  medianCold: number | null;
  medianWarm: number | null;
}

export interface CacheBenefit {
  delta: number | null;
  pct: number | null;
}

const parseSnapshot = (path: string): FlagshipSnapshot => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  return {
    runAt: String(raw['runAt'] ?? ''),
    eslintVersion: String(raw['eslintVersion'] ?? ''),
    // Upstream emits "Version: 1.63.0"; strip the prefix for display parity
    // with eslintVersion which is already bare ("v9.39.4").
    oxlintVersion: String(raw['oxlintVersion'] ?? '').replace(/^Version:\s*/, ''),
    nodeVersion: String(raw['nodeVersion'] ?? ''),
    schema: String(raw['schema'] ?? ''),
    filename: path.split('/').pop() ?? path,
    results: (raw['results'] as FlagshipResultRow[] | undefined) ?? [],
  };
};

/**
 * Returns the newest dated snapshot covering all 10 flagship rules.
 *
 * Sub-10 snapshots are emitted when a developer reruns a single rule
 * (e.g. 2026-05-11.json is a no-cycle-only retry). Picking one of those
 * naively would render a half-empty page, so we skip them.
 */
export function loadLatestFlagshipSnapshot(
  dir = FLAGSHIP_RESULTS_DIR,
): FlagshipSnapshot | null {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const dated = entries
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .reverse();
  for (const name of dated) {
    try {
      const snapshot = parseSnapshot(join(dir, name));
      if (snapshot.results.length >= FLAGSHIP_RULES.length) return snapshot;
    } catch {
      // skip malformed
    }
  }
  return null;
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
};

/**
 * Per-stack median cold/warm across the snapshot's results. Matches the
 * "Cache effectiveness (median across rules)" table in the markdown report
 * at benchmark-results/ilb-flagship-scorecard.md — same formula, same units.
 */
export function computeStackMedians(snapshot: FlagshipSnapshot): StackMedian[] {
  return STACKS.map((stack) => {
    const colds: number[] = [];
    const warms: number[] = [];
    for (const result of snapshot.results) {
      const cold = result.runs[stack]?.cold?.ms;
      const warm = result.runs[stack]?.warm?.ms;
      if (typeof cold === 'number') colds.push(cold);
      if (typeof warm === 'number') warms.push(warm);
    }
    return {
      stack,
      label: STACK_LABELS[stack],
      medianCold: median(colds),
      medianWarm: median(warms),
    };
  });
}

export function computeCacheBenefit(m: StackMedian): CacheBenefit {
  if (m.medianCold === null || m.medianWarm === null || m.medianCold === 0) {
    return { delta: null, pct: null };
  }
  const delta = m.medianCold - m.medianWarm;
  return { delta, pct: Math.round((delta / m.medianCold) * 100) };
}

/**
 * Returns the rule rows keyed by canonical FLAGSHIP_RULES order, so the
 * table renders in the documented order regardless of how the snapshot
 * happened to serialise the results.
 */
export function orderResultsByFlagshipSpec(
  snapshot: FlagshipSnapshot,
): readonly FlagshipResultRow[] {
  const byRule = new Map(snapshot.results.map((r) => [r.rule, r] as const));
  return FLAGSHIP_RULES.map((rule) => byRule.get(rule)).filter(
    (r): r is FlagshipResultRow => r !== undefined,
  );
}

export const formatMs = (ms: number | null | undefined): string =>
  typeof ms === 'number' ? `${ms.toLocaleString()} ms` : '—';

export const formatCount = (n: number | null | undefined): string =>
  typeof n === 'number' ? n.toLocaleString() : '—';

export function formatRunAt(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    // Date() never throws but toISOString() does on Invalid Date — preserve
    // whatever the snapshot emitted rather than crash the page.
    return iso;
  }
}
