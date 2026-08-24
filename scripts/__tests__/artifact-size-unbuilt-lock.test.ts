/**
 * Lock for check-artifact-size's removed/unmeasured split.
 *
 * On 2026-08-23 a partially-built tree reported five live, published plugins
 * (lambda-security, modernization, node-security, operability,
 * vercel-ai-security) as removed from the ecosystem, because "no
 * dist/package.json" and "no longer exists" were the same branch. A package
 * reported gone also stops being size-tracked, which is exactly the silent
 * drift this script exists to catch.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/artifact-size-unbuilt-lock.test.ts
 */

import { describe, it, expect } from 'vitest';

import { classify } from '../check-artifact-size.js';

const BASELINE = {
  'eslint-plugin-jwt': 100,
  'eslint-plugin-node-security': 400,
  'eslint-plugin-operability': 200,
};

describe('classify', () => {
  it('does NOT call an unbuilt package removed', () => {
    const diff = classify(
      { 'eslint-plugin-jwt': 100 },
      ['eslint-plugin-node-security', 'eslint-plugin-operability'],
      BASELINE,
    );
    expect(diff.removed).toEqual([]);
    expect(diff.unmeasured).toEqual([
      'eslint-plugin-node-security',
      'eslint-plugin-operability',
    ]);
  });

  it('still reports a package that really left packages/', () => {
    const diff = classify({ 'eslint-plugin-jwt': 100 }, [], BASELINE);
    expect(diff.removed).toEqual([
      'eslint-plugin-node-security',
      'eslint-plugin-operability',
    ]);
    expect(diff.unmeasured).toEqual([]);
  });

  it('keeps the two buckets disjoint when both apply', () => {
    const diff = classify(
      { 'eslint-plugin-jwt': 100 },
      ['eslint-plugin-operability'],
      BASELINE,
    );
    expect(diff.removed).toEqual(['eslint-plugin-node-security']);
    expect(diff.unmeasured).toEqual(['eslint-plugin-operability']);
  });

  it('measures growth and shrink only on packages that were built', () => {
    const diff = classify(
      { 'eslint-plugin-jwt': 200 },
      ['eslint-plugin-node-security'],
      BASELINE,
    );
    expect(diff.grew.map((r) => r.name)).toEqual(['eslint-plugin-jwt']);
    expect(diff.shrank).toEqual([]);
    expect(diff.added).toEqual([]);
    // The buckets stay disjoint here too: operability is neither built nor
    // unbuilt-and-present, so it is the only genuine removal.
    expect(diff.unmeasured).toEqual(['eslint-plugin-node-security']);
    expect(diff.removed).toEqual(['eslint-plugin-operability']);
  });
});
