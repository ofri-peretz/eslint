/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The control-band watcher is what invokes an agent unattended, so its detection has
 * to be reproducible and pinned. AI_NATIVE_SDLC.md: "a version-controlled, unit-tested
 * detection script ... no AI, pure statistical logic."
 *
 * Each case below is one Western Electric rule plus the ways each is supposed to stay
 * quiet. The quiet cases matter more than the loud ones: a watcher that fires on
 * ordinary variation gets muted, and a muted watcher is the thing this replaces.
 */

import { describe, it, expect } from 'vitest';
import { mean, stdev, detect, evaluate } from '../control-bands';

/** n points at `base`, so σ is well defined and the mean sits where we expect. */
const flatish = (n: number, base: number) =>
  Array.from({ length: n }, (_, i) => base + (i % 2 === 0 ? 0.5 : -0.5));

describe('statistics', () => {
  it('computes mean and population sigma', () => {
    expect(mean([2, 4, 6])).toBe(4);
    // Population, not sample: sqrt(((2-4)^2 + 0 + (6-4)^2)/3) = sqrt(8/3).
    expect(stdev([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });

  it('treats a perfectly flat series as stable rather than infinitely deviant', () => {
    // σ=0 makes every z-score division degenerate. A metric pinned at 100 for weeks
    // has not drifted; it is the healthiest series there is.
    expect(detect([100, 100, 100, 100, 100, 100, 100, 100, 100], 'lower')).toBeNull();
  });
});

describe('Western Electric rules', () => {
  it('rule 1 — a single point beyond 3σ', () => {
    const hit = detect([...flatish(10, 100), 60], 'lower');
    expect(hit?.tier).toBe('3σ');
    expect(hit?.rule).toContain('3σ');
    expect(hit?.direction).toBe('below');
  });

  it('rule 4 — eight consecutive on one side is drift, even with no unusual point', () => {
    // The case a threshold cannot see: every value is ordinary, the run is not.
    const series = [...flatish(10, 100), ...Array.from({ length: 8 }, () => 100.4)];
    const hit = detect(series, 'higher');
    expect(hit?.tier).toBe('1σ');
    expect(hit?.rule).toContain('8 consecutive');
  });

  it('respects direction — a rise is not a breach when only a fall is bad', () => {
    const hit = detect([...flatish(10, 100), 140], 'lower');
    expect(hit).toBeNull();
  });

  it('stays quiet on ordinary variation', () => {
    expect(detect(flatish(20, 100), 'both')).toBeNull();
  });

  it('needs at least three points to say anything', () => {
    expect(detect([100, 40], 'lower')).toBeNull();
  });
});

describe('evaluate', () => {
  const cfg = {
    id: 'demo',
    description: 'demo',
    collector: 'manual' as const,
    window: 20,
    minPoints: 8,
    worse: 'lower' as const,
  };
  const obs = (vs: number[]) =>
    vs.map((v, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, value: v }));

  it('refuses to compute a band below minPoints — an unsupported band must not gate', () => {
    expect(evaluate(cfg, obs([100, 100, 40]))).toBeNull();
  });

  it('reports the breach with the numbers a reader needs to argue with it', () => {
    const breach = evaluate(cfg, obs([...flatish(10, 100), 60]));
    expect(breach).not.toBeNull();
    expect(breach!.id).toBe('demo');
    expect(breach!.tier).toBe('3σ');
    expect(breach!.latest).toBe(60);
    expect(breach!.window).toBe(11);
    expect(breach!.sigma).toBeGreaterThan(0);
  });
});
