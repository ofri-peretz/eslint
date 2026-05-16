/**
 * Shared loader + helpers for ILB-Flagship dated JSON snapshots.
 *
 * Single source of truth for two consumers that both read the same
 * `benchmarks/results/ilb-flagship/<date>.json` snapshots and produce the
 * same derived stats:
 *
 *   - `benchmarks/suites/ilb-flagship/scorecard.ts` — markdown emitter
 *     (the report committed to `benchmark-results/ilb-flagship-scorecard.md`)
 *   - `apps/docs/src/lib/scorecard.ts` — Next.js Server Component loader
 *     (the public `/scorecard` page)
 *
 * Lifted from those two callsites on 2026-05-16. Before this lift, both
 * had their own `median()` + `computeStackMedians()` + formatter
 * implementations that silently drifted (e.g. the markdown emitter
 * didn't use `toLocaleString` while the page did).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { median } from './median.js';

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

export const STACK_LABELS = {
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
  skipped?: string;
}

export interface FlagshipSnapshot {
  runAt: string;
  eslintVersion: string;
  oxlintVersion: string;
  nodeVersion: string;
  schema: string;
  filename: string;
  oosDir?: string;
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

const STRICT_DATED = /^\d{4}-\d{2}-\d{2}\.json$/;

export function parseFlagshipSnapshot(path: string): FlagshipSnapshot {
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
    oosDir: typeof raw['oosDir'] === 'string' ? raw['oosDir'] : undefined,
    results: (raw['results'] as FlagshipResultRow[] | undefined) ?? [],
  };
}

/**
 * Returns the newest dated snapshot covering all 10 flagship rules.
 *
 * Sub-10 snapshots are emitted when a developer reruns a single rule
 * (e.g. 2026-05-11.json was a no-cycle-only retry). Picking one of those
 * naively would render a half-empty page / partial markdown report, so
 * we skip them.
 */
export function loadLatestFlagshipSnapshot(dir: string): FlagshipSnapshot | null {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const dated = entries.filter((name) => STRICT_DATED.test(name)).sort().reverse();
  for (const name of dated) {
    try {
      const snapshot = parseFlagshipSnapshot(join(dir, name));
      if (snapshot.results.length >= FLAGSHIP_RULES.length) return snapshot;
    } catch {
      // skip malformed
    }
  }
  return null;
}

/**
 * Per-stack median cold/warm across the snapshot's results. Matches the
 * "Cache effectiveness (median across rules)" table in the markdown report.
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
 * Snapshot results reordered to the canonical FLAGSHIP_RULES order, so
 * tables render in the documented order regardless of serialisation.
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
    // whatever the snapshot emitted rather than crash the consumer.
    return iso;
  }
}
