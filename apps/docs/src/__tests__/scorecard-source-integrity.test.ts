/**
 * Scorecard data-loader integrity — exercises the pure functions in
 * src/lib/scorecard.ts against the actual JSON in
 * benchmarks/results/ilb-flagship/. Catches:
 *
 *   - A snapshot with no `results[]` covering all 10 flagship rules
 *     (would render a half-empty page).
 *   - The `oxlintVersion` prefix-strip regressing.
 *   - The flagship rule list drifting out of sync with the spec.
 *
 * Companion to scorecard-lock.test.ts, which locks the page surface.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import {
  FLAGSHIP_RULES,
  computeStackMedians,
  loadLatestFlagshipSnapshot,
  orderResultsByFlagshipSpec,
  type FlagshipSnapshot,
} from '../lib/scorecard';

// Load the snapshot once for the whole suite — every test case used to
// re-discover + re-parse it, an N+1 hidden inside `findLatestFlagshipSnapshotPath`
// before the combined loader landed. `null` means the bench results aren't
// populated in this checkout (e.g. shallow clones for docs-only deploys);
// the page falls back to its "no data" message in that case, exercised by
// the lock test rather than here.
let snapshot: FlagshipSnapshot | null;
beforeAll(() => {
  snapshot = loadLatestFlagshipSnapshot();
});

describe('FLAGSHIP_RULES', () => {
  it('lists exactly 10 rules (the documented flagship count)', () => {
    expect(FLAGSHIP_RULES).toHaveLength(10);
  });

  it('uses bare plugin keys (no @eslint/ or @interlace/ scoping)', () => {
    for (const rule of FLAGSHIP_RULES) {
      expect(rule).not.toMatch(/^@/);
      expect(rule).not.toMatch(/\/react\/|\/maintainability\/|\/operability\//);
    }
  });
});

describe('loadLatestFlagshipSnapshot', () => {
  it('picks a snapshot covering all 10 flagship rules (skips re-runs of a subset)', () => {
    if (!snapshot) return;
    expect(snapshot.results.length).toBeGreaterThanOrEqual(FLAGSHIP_RULES.length);
  });

  it('strips the "Version: " prefix from oxlintVersion for display parity', () => {
    if (!snapshot) return;
    expect(snapshot.oxlintVersion).not.toMatch(/^Version:/);
  });

  it('populates the four provenance fields the page renders', () => {
    if (!snapshot) return;
    expect(snapshot.runAt).toBeTruthy();
    expect(snapshot.eslintVersion).toBeTruthy();
    expect(snapshot.oxlintVersion).toBeTruthy();
    expect(snapshot.nodeVersion).toBeTruthy();
  });

  it('reports a filename matching the dated snapshot convention', () => {
    if (!snapshot) return;
    expect(snapshot.filename).toMatch(/^\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('orderResultsByFlagshipSpec', () => {
  it('returns rules in the canonical FLAGSHIP_RULES order', () => {
    if (!snapshot) return;
    const orderedRuleIds = orderResultsByFlagshipSpec(snapshot).map((r) => r.rule);
    const expected = FLAGSHIP_RULES.filter((rule) =>
      snapshot!.results.some((r) => r.rule === rule),
    );
    expect(orderedRuleIds).toEqual(expected);
  });
});

describe('computeStackMedians', () => {
  it('produces medians for the three stacks the page renders', () => {
    if (!snapshot) return;
    const labels = computeStackMedians(snapshot).map((m) => m.stack);
    expect(labels).toEqual(['oursEslint', 'competitorEslint', 'oxlintNative']);
  });

  it('returns numeric medians for stacks that have any data', () => {
    if (!snapshot) return;
    const ours = computeStackMedians(snapshot).find((m) => m.stack === 'oursEslint')!;
    expect(typeof ours.medianCold).toBe('number');
    expect(typeof ours.medianWarm).toBe('number');
  });
});
