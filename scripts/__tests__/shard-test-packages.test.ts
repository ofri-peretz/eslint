import { describe, it, expect } from 'vitest';
import {
  testPackages,
  partition,
  buildMatrix,
  // @ts-expect-error — plain .mjs helper, no d.ts by design.
} from '../ci/shard-test-packages.mjs';

/**
 * Locks for the CI test-shard partitioner.
 *
 * The property that matters is TOTALITY. `Quality (Full) Gate` is a required
 * check; if a package falls out of every shard, CI reports green having run
 * none of that package's tests. That is strictly worse than a slow pipeline,
 * so these tests exist to make the sharding trustworthy rather than merely
 * fast.
 */

const dryRun = (
  entries: Array<{ package: string; task?: string; command?: string }>,
) => ({ tasks: entries.map((e) => ({ task: 'test', command: 'vitest run', ...e })) });

const names = (n: number, prefix = 'pkg') =>
  Array.from({ length: n }, (_, i) => `${prefix}-${String(i).padStart(3, '0')}`);

describe('testPackages', () => {
  it('keeps only packages with a real test script', () => {
    const input = dryRun([
      { package: 'a' },
      { package: 'b', command: '<NONEXISTENT>' },
      { package: 'c' },
    ]);
    expect(testPackages(input)).toEqual(['a', 'c']);
  });

  it('ignores non-test tasks and de-duplicates', () => {
    const input = {
      tasks: [
        { package: 'a', task: 'test', command: 'vitest run' },
        { package: 'a', task: 'test', command: 'vitest run' },
        { package: 'b', task: 'build', command: 'tsc' },
      ],
    };
    expect(testPackages(input)).toEqual(['a']);
  });

  it('is deterministic regardless of turbo ordering', () => {
    const a = testPackages(dryRun([{ package: 'z' }, { package: 'm' }, { package: 'a' }]));
    const b = testPackages(dryRun([{ package: 'a' }, { package: 'z' }, { package: 'm' }]));
    expect(a).toEqual(b);
    expect(a).toEqual(['a', 'm', 'z']);
  });

  it('survives malformed input without inventing packages', () => {
    expect(testPackages({})).toEqual([]);
    expect(testPackages({ tasks: null })).toEqual([]);
    expect(testPackages(undefined)).toEqual([]);
    expect(testPackages({ tasks: [{ task: 'test', command: 'x' }] })).toEqual([]);
  });
});

describe('partition — TOTALITY', () => {
  // The core safety property, swept across realistic and degenerate shapes.
  for (const size of [0, 1, 2, 7, 27, 34, 100]) {
    for (const count of [1, 2, 3, 4, 6, 8, 12]) {
      it(`covers all ${size} package(s) exactly once across ${count} shard(s)`, () => {
        const input = names(size);
        const shards = partition(input, count);
        const flat = shards.flat();

        // Nothing dropped...
        expect([...flat].sort()).toEqual([...input].sort());
        // ...and nothing duplicated (a dupe wastes a runner but also means the
        // balance math is lying).
        expect(new Set(flat).size).toBe(flat.length);
        // No empty shards — an empty shard burns a runner and setup cost.
        expect(shards.every((s) => s.length > 0)).toBe(true);
        // Never more shards than requested, or than there is work for.
        expect(shards.length).toBeLessThanOrEqual(Math.min(count, Math.max(size, 0)) || 0);
      });
    }
  }

  it('spreads same-prefix packages instead of clumping them', () => {
    // Contiguous slicing would put every eslint-plugin-* in one shard; the
    // whole point of round-robin is that it does not.
    const input = [...names(8, 'eslint-plugin'), ...names(2, 'zz-other')];
    const shards = partition(input, 4);
    for (const s of shards) {
      expect(s.filter((p) => p.startsWith('eslint-plugin')).length).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic across repeated calls', () => {
    const input = names(27);
    expect(partition(input, 5)).toEqual(partition(input, 5));
  });

  it('clamps a nonsensical shard count instead of producing zero shards', () => {
    // A zero/negative count from a bad workflow input must not silently drop
    // every package.
    for (const bad of [0, -3, Number.NaN]) {
      const shards = partition(names(5), bad as number);
      expect(shards.flat().sort()).toEqual(names(5).sort());
    }
  });
});

describe('buildMatrix', () => {
  it('emits one no-op shard when nothing is affected', () => {
    // An empty `include` makes GitHub skip the job; `needs.test.result` becomes
    // `skipped`, which the aggregating gate counts as failure. One empty shard
    // keeps a legitimately-no-op PR green without teaching the gate to accept
    // `skipped` as success.
    const matrix = buildMatrix([], 4);
    expect(matrix.include).toHaveLength(1);
    expect(matrix.include[0].packages).toBe('');
  });

  it('never emits more shards than packages', () => {
    const matrix = buildMatrix(names(3), 8);
    expect(matrix.include).toHaveLength(3);
    expect(matrix.include.every((s: { packages: string }) => s.packages !== '')).toBe(true);
  });

  it('round-trips every package into the space-joined filter list', () => {
    const input = names(27);
    const matrix = buildMatrix(input, 4);
    const flat = matrix.include.flatMap((s: { packages: string }) => s.packages.split(' '));
    expect(flat.sort()).toEqual([...input].sort());
  });

  it('labels shards readably for the Actions UI', () => {
    const matrix = buildMatrix(names(6), 3);
    expect(matrix.include.map((s: { shard: string }) => s.shard)).toEqual([
      '1/3',
      '2/3',
      '3/3',
    ]);
  });
});
