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

import { describe, it, expect } from 'vitest';

import {
  FLAGSHIP_RULES,
  computeStackMedians,
  findLatestFlagshipSnapshotPath,
  loadFlagshipSnapshot,
  orderResultsByFlagshipSpec,
} from '../lib/scorecard';

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

describe('findLatestFlagshipSnapshotPath', () => {
  it('returns a path that exists on disk', () => {
    const path = findLatestFlagshipSnapshotPath();
    // Skip if benchmarks/results/ilb-flagship/ isn't populated in this
    // checkout (e.g. shallow clones for docs-only deploys). The page
    // falls back to the "no data" message in that case — that path is
    // exercised by the lock test, not here.
    if (!path) return;
    expect(path).toMatch(/benchmarks\/results\/ilb-flagship\/\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('picks a snapshot covering all 10 flagship rules (skips re-runs of a subset)', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    expect(snapshot.results.length).toBeGreaterThanOrEqual(FLAGSHIP_RULES.length);
  });
});

describe('loadFlagshipSnapshot', () => {
  it('strips the "Version: " prefix from oxlintVersion for display parity', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    expect(snapshot.oxlintVersion).not.toMatch(/^Version:/);
  });

  it('populates the four provenance fields the page renders', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    expect(snapshot.runAt).toBeTruthy();
    expect(snapshot.eslintVersion).toBeTruthy();
    expect(snapshot.oxlintVersion).toBeTruthy();
    expect(snapshot.nodeVersion).toBeTruthy();
  });
});

describe('orderResultsByFlagshipSpec', () => {
  it('returns rules in the canonical FLAGSHIP_RULES order', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    const ordered = orderResultsByFlagshipSpec(snapshot);
    const orderedRuleIds = ordered.map((r) => r.rule);
    const expected = FLAGSHIP_RULES.filter((rule) =>
      snapshot.results.some((r) => r.rule === rule),
    );
    expect(orderedRuleIds).toEqual(expected);
  });
});

describe('computeStackMedians', () => {
  it('produces medians for the three stacks the page renders', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    const medians = computeStackMedians(snapshot);
    const labels = medians.map((m) => m.stack);
    expect(labels).toEqual(['oursEslint', 'competitorEslint', 'oxlintNative']);
  });

  it('returns numeric medians for stacks that have any data', () => {
    const path = findLatestFlagshipSnapshotPath();
    if (!path) return;
    const snapshot = loadFlagshipSnapshot(path);
    const medians = computeStackMedians(snapshot);
    const ours = medians.find((m) => m.stack === 'oursEslint')!;
    // Our stack runs on every flagship rule, so both cold + warm must be
    // populated.
    expect(typeof ours.medianCold).toBe('number');
    expect(typeof ours.medianWarm).toBe('number');
  });
});
