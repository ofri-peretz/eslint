/**
 * Scorecard data loader for /scorecard.
 *
 * The ground-truth lives in `benchmarks/results/ilb-flagship/<date>.json` —
 * dated snapshots emitted by `npm run ilb:flagship`. This module finds the
 * latest snapshot that covers all 10 flagship rules and returns a typed
 * view shaped for rendering, plus a couple of derived summaries (median
 * cold/warm) that the markdown report at
 * `benchmark-results/ilb-flagship-scorecard.md` already publishes.
 *
 * Pure functions only — no React. Imported by the Server Component at
 * `src/app/scorecard/page.tsx` and locked by
 * `src/__tests__/scorecard-source-integrity.test.ts`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FLAGSHIP_RESULTS_DIR = resolve(
  process.cwd(),
  '../../benchmarks/results/ilb-flagship',
);

/**
 * The 10 flagship rule identifiers per .agent/flagship-rules.md.
 * Pinned here so the loader fails closed if a snapshot's `results[]`
 * doesn't cover the full list (e.g. someone re-ran a subset).
 */
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

export type Stack = 'oursEslint' | 'competitorEslint' | 'oxlintNative';

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

const STACK_LABELS: Record<Stack, string> = {
  oursEslint: 'Ours (ESLint)',
  competitorEslint: 'Competitor (ESLint)',
  oxlintNative: 'oxlint native (competitor)',
};

/**
 * Find the newest dated snapshot covering all 10 flagship rules.
 *
 * Sub-10 snapshots are emitted when a developer reruns a single rule
 * (e.g. 2026-05-11.json is a no-cycle-only retry). Those would render
 * a half-empty page if naively picked, so we skip them.
 */
export function findLatestFlagshipSnapshotPath(dir = FLAGSHIP_RESULTS_DIR): string | null {
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
    const path = join(dir, name);
    try {
      const json = JSON.parse(readFileSync(path, 'utf8')) as { results?: unknown[] };
      if (Array.isArray(json.results) && json.results.length >= FLAGSHIP_RULES.length) {
        return path;
      }
    } catch {
      // skip malformed
    }
  }
  return null;
}

export function loadFlagshipSnapshot(path: string): FlagshipSnapshot {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const filename = path.split('/').pop() ?? path;
  return {
    runAt: String(raw['runAt'] ?? ''),
    eslintVersion: String(raw['eslintVersion'] ?? ''),
    // Upstream emits "Version: 1.63.0"; strip the prefix for display parity
    // with the eslint version, which is already bare ("v9.39.4").
    oxlintVersion: String(raw['oxlintVersion'] ?? '').replace(/^Version:\s*/, ''),
    nodeVersion: String(raw['nodeVersion'] ?? ''),
    schema: String(raw['schema'] ?? ''),
    filename,
    results: (raw['results'] as FlagshipResultRow[] | undefined) ?? [],
  };
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
 * "Cache effectiveness (median across rules)" table in the markdown
 * report — same formula, same units (ms).
 */
export function computeStackMedians(snapshot: FlagshipSnapshot): StackMedian[] {
  const stacks: Stack[] = ['oursEslint', 'competitorEslint', 'oxlintNative'];
  return stacks.map((stack) => {
    const colds = snapshot.results
      .map((r) => r.runs[stack]?.cold?.ms)
      .filter((ms): ms is number => typeof ms === 'number');
    const warms = snapshot.results
      .map((r) => r.runs[stack]?.warm?.ms)
      .filter((ms): ms is number => typeof ms === 'number');
    return {
      stack,
      label: STACK_LABELS[stack],
      medianCold: median(colds),
      medianWarm: median(warms),
    };
  });
}

/**
 * Returns the rule row keyed by canonical FLAGSHIP_RULES order, so the
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
