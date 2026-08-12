/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the logic behind ILB-Preset-Budget's headline number.
 *
 * The bench answers "how many findings does `recommended` print on a real
 * repository?" — the question that decides whether a plugin survives its first
 * afternoon. Both helpers below have already produced a wrong headline once:
 * an unparsed preset would score a plugin as perfectly quiet, and counting
 * resolution-dependent rules put `import-next` at 440 findings per repository
 * when the real figure is 90.
 */
import { describe, it, expect } from 'vitest';
import {
  RESOLUTION_DEPENDENT,
  percentile,
  recommendedRules,
} from '../suites/ilb-preset-budget/preset-stats.ts';

describe('recommendedRules', () => {
  it('reads the flat-config shape', () => {
    const configs = {
      recommended: { plugins: {}, rules: { 'p/a': 'error', 'p/b': 'warn' } },
    };
    expect(Object.keys(recommendedRules(configs))).toEqual(['p/a', 'p/b']);
  });

  it('merges the legacy array shape in order', () => {
    const configs = {
      recommended: [
        { rules: { 'p/a': 'error' } },
        { rules: { 'p/b': 'warn', 'p/a': 'off' } },
      ],
    };
    const rules = recommendedRules(configs);
    expect(Object.keys(rules).sort()).toEqual(['p/a', 'p/b']);
    // Later blocks win, as ESLint itself resolves them.
    expect(rules['p/a']).toBe('off');
  });

  it('returns nothing for a plugin with no recommended preset', () => {
    expect(recommendedRules({ strict: { rules: { 'p/a': 'error' } } })).toEqual({});
  });

  it.each([
    ['undefined configs', undefined],
    ['null configs', null],
    ['a recommended set to null', { recommended: null }],
    ['a recommended with no rules block', { recommended: { plugins: {} } }],
    ['an empty array preset', { recommended: [] }],
  ])('survives %s rather than throwing', (_label, configs) => {
    // A preset this cannot parse would score the plugin as perfectly quiet —
    // the most flattering possible wrong answer, which is why it must not throw
    // *or* silently succeed on a shape it did not understand.
    expect(recommendedRules(configs)).toEqual({});
  });
});

describe('percentile', () => {
  const sorted = [0, 0, 1, 3, 7, 12, 40, 88, 500, 41423];

  it('takes the median at p50', () => {
    expect(percentile(sorted, 0.5)).toBe(12);
  });

  it('takes the tail at p90', () => {
    expect(percentile(sorted, 0.9)).toBe(41423);
  });

  it('is nearest-rank, never interpolated', () => {
    // Every value it reports is a real repository's finding count, so it can be
    // looked up and reproduced.
    expect(sorted).toContain(percentile(sorted, 0.5));
    expect(sorted).toContain(percentile(sorted, 0.25));
  });

  it('does not run off the end at p100', () => {
    expect(percentile(sorted, 1)).toBe(41423);
  });

  it('handles a single repository', () => {
    expect(percentile([5], 0.5)).toBe(5);
    expect(percentile([5], 0.9)).toBe(5);
  });

  it('returns zero for an empty corpus rather than NaN', () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it('barely moves for one enormous outlier, where a mean explodes', () => {
    // The reason the median is the headline. Adding a 41,000-finding monorepo
    // to five quiet repositories moves the median by one finding and the mean
    // by seven thousand — and only one of those describes what a developer sees.
    const withMonorepo = [0, 0, 0, 1, 2, 41423];
    const mean = withMonorepo.reduce((a, b) => a + b, 0) / withMonorepo.length;
    expect(percentile([0, 0, 0, 1, 2], 0.5)).toBe(0);
    expect(percentile(withMonorepo, 0.5)).toBe(1);
    expect(Math.round(mean)).toBe(6904);
  });
});

describe('RESOLUTION_DEPENDENT', () => {
  it('excludes the rule that produced the artefact', () => {
    expect(RESOLUTION_DEPENDENT.has('import-next/no-unresolved')).toBe(true);
  });

  it('leaves rules that need no module resolution measurable', () => {
    // These are real preset cost and must keep counting.
    expect(RESOLUTION_DEPENDENT.has('import-next/order')).toBe(false);
    expect(RESOLUTION_DEPENDENT.has('import-next/no-duplicates')).toBe(false);
    expect(RESOLUTION_DEPENDENT.has('conventions/no-magic-numbers')).toBe(false);
  });

  it('names every entry with its plugin prefix, so it cannot match by accident', () => {
    for (const id of RESOLUTION_DEPENDENT) {
      expect(id).toMatch(/^[a-z-]+\/[a-z-]+$/);
    }
  });
});
