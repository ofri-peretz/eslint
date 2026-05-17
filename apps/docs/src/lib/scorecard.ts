/**
 * Scorecard data loader for /scorecard — thin wrapper around the shared
 * `@interlace/benchmarks/lib/flagship-snapshot` lib. All snapshot
 * loading, type definitions, median + cache-benefit math, and formatters
 * live in the bench package so the markdown emitter
 * (`benchmarks/suites/ilb-flagship/scorecard.ts`) and this Server
 * Component never silently drift.
 *
 * Locked by `src/__tests__/scorecard-source-integrity.test.ts`.
 */

import { resolve } from 'node:path';

import {
  loadLatestFlagshipSnapshot as loadFromDir,
  type FlagshipSnapshot,
} from '@interlace/benchmarks/lib/flagship-snapshot';

export {
  FLAGSHIP_RULES,
  computeCacheBenefit,
  computeStackMedians,
  formatCount,
  formatMs,
  formatRunAt,
  orderResultsByFlagshipSpec,
  type FlagshipResultRow,
  type FlagshipRuleId,
  type FlagshipSnapshot,
  type Stack,
  type StackMedian,
} from '@interlace/benchmarks/lib/flagship-snapshot';

const FLAGSHIP_RESULTS_DIR = resolve(
  process.cwd(),
  '../../benchmarks/results/ilb-flagship',
);

/** Cwd-anchored convenience wrapper for the Server Component. */
export function loadLatestFlagshipSnapshot(): FlagshipSnapshot | null {
  return loadFromDir(FLAGSHIP_RESULTS_DIR);
}
