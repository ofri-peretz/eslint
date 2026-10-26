/**
 * Lock: `findStaleHashes` must not flag a task the perturbation could not
 * have touched.
 *
 * `scripts/audit-cache-invalidation.ts` filed #1304 against every
 * `oxlint-plugin-*` alias and against `@interlace/eslint-devkit#build` on a
 * run that probed `eslint-plugin-conventions`. Reproduced directly against
 * turbo (see the perturbation below): neither was a real stale-hash path.
 *
 *   - `@interlace/eslint-devkit#build` appears in the plan only because
 *     `eslint-plugin-conventions#test` depends on `^build`, and devkit sits
 *     upstream of conventions in that closure. Perturbing conventions' own
 *     source has no reason to move devkit's hash — devkit does not depend on
 *     conventions. The audit checked every taskId in the plan instead of
 *     only the ones in scope, so this unrelated, correctly-unmoved hash read
 *     as a finding.
 *   - `oxlint-plugin-conventions#test` has no `test` script in its
 *     package.json, so turbo gives it the `<NONEXISTENT>` placeholder
 *     command. It runs nothing whether the hash moves or not, so a "stale"
 *     hash there replays zero real work.
 *
 * This test pins the fix with synthetic task snapshots, not real turbo
 * calls, so it runs in milliseconds and fails if either exclusion
 * regresses. The genuine case — a real command, in scope, whose hash
 * legitimately failed to move — must still be caught.
 */

import { describe, it, expect } from 'vitest';
import {
  findStaleHashes,
  type TaskSnapshot,
} from '../cache-invalidation-findings.ts';

const snap = (hash: string, command = 'vitest run'): TaskSnapshot => ({
  hash,
  command,
});

describe('findStaleHashes', () => {
  it('ignores an out-of-scope task even when its hash did not move', () => {
    // Mirrors the real plan: perturbing `eslint-plugin-conventions` pulls in
    // `@interlace/eslint-devkit#build`, which is not part of the probed scope.
    const before = new Map([
      ['eslint-plugin-conventions#test', snap('A')],
      ['oxlint-plugin-conventions#test', snap('B')],
      ['@interlace/eslint-devkit#build', snap('UNCHANGED')],
    ]);
    const after = new Map([
      ['eslint-plugin-conventions#test', snap('A2')], // moved — upstream's own source changed
      ['oxlint-plugin-conventions#test', snap('B2')], // moved — a real dependent
      ['@interlace/eslint-devkit#build', snap('UNCHANGED')], // correctly did not move
    ]);

    const findings = findStaleHashes(
      before,
      after,
      ['eslint-plugin-conventions', 'oxlint-plugin-conventions'],
      () => 'should not fire',
    );

    expect(findings).toEqual([]);
  });

  it("ignores a no-op task (turbo's <NONEXISTENT> command) even in scope", () => {
    const before = new Map([
      ['eslint-plugin-conventions#test', snap('A')],
      ['oxlint-plugin-conventions#test', snap('B', '<NONEXISTENT>')],
    ]);
    const after = new Map([
      ['eslint-plugin-conventions#test', snap('A2')],
      ['oxlint-plugin-conventions#test', snap('B', '<NONEXISTENT>')], // unchanged, but runs nothing
    ]);

    const findings = findStaleHashes(
      before,
      after,
      ['eslint-plugin-conventions', 'oxlint-plugin-conventions'],
      () => 'should not fire',
    );

    expect(findings).toEqual([]);
  });

  it('still reports a genuine stale hash: in scope, a real command, unmoved', () => {
    const before = new Map([
      ['eslint-plugin-conventions#test', snap('A')],
      ['oxlint-plugin-conventions#test', snap('STALE')],
    ]);
    const after = new Map([
      ['eslint-plugin-conventions#test', snap('A2')],
      ['oxlint-plugin-conventions#test', snap('STALE')], // real command, hash did not move
    ]);

    const findings = findStaleHashes(
      before,
      after,
      ['eslint-plugin-conventions', 'oxlint-plugin-conventions'],
      (taskId) => `${taskId} would replay a stale pass`,
    );

    expect(findings).toEqual([
      {
        task: 'oxlint-plugin-conventions#test',
        reason: 'oxlint-plugin-conventions#test would replay a stale pass',
      },
    ]);
  });

  it('a task missing from `after` entirely is not a finding either way', () => {
    const before = new Map([['pkg-a#test', snap('A')]]);
    const after = new Map<string, TaskSnapshot>();

    expect(findStaleHashes(before, after, ['pkg-a'], () => 'x')).toEqual([]);
  });
});
