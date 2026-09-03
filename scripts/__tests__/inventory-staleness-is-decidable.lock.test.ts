/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The ledger must be ABLE to say the real-code inventory is current.
 *
 * `rule-case-ledger` compares the inventory's recorded `configHash` against a
 * hash it computes from `eslint.real-source.config.mjs`, and prints one of two
 * things: three real-code numbers, or a STALE notice saying the artefact came
 * from a different config.
 *
 * The hash was computed by a bare `createHash(...)` in a file that imports
 * `crypto` as a DEFAULT import. That is a ReferenceError, it was thrown inside
 * a `try { … } catch { return null }`, and null never equals a recorded hash —
 * so the ledger printed STALE unconditionally, for every inventory, for as
 * long as the check existed. "fires on real code", "scanned and never fired"
 * and "never scanned" had never printed once.
 *
 * Two things make that worth a lock rather than a one-line fix:
 *
 *   the message named the wrong cause. It said the artefact was produced by a
 *   different config and told the reader to re-run a scan that is CI-only.
 *   Following it would have cost a scan and changed nothing.
 *
 *   it is the exact failure this ledger exists to catch — an instrument
 *   reporting a confident, plausible, permanently wrong answer — committed by
 *   the instrument itself. A bare catch around a computation whose failure
 *   mode is "we cannot vouch for this" will hide a programming error as
 *   untrustworthy data.
 *
 * So this asserts the DECISION is reachable in both directions: matching
 * hashes must produce the numbers, mismatched hashes must produce the notice.
 * It can never pass vacuously, because exactly one branch applies on any tree.
 */

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

function hashOf(rel: string): string {
  return createHash('sha256')
    .update(readFileSync(join(REPO_ROOT, rel)))
    .digest('hex')
    .slice(0, 16);
}

describe('the real-code inventory can be judged current', () => {
  it('prints the numbers when the config matches, the notice when it does not', () => {
    const inventory = JSON.parse(
      readFileSync(
        join(REPO_ROOT, 'benchmarks/budgets/real-world-rule-inventory.json'),
        'utf-8',
      ),
    ) as { configHash?: string };

    const recorded = inventory.configHash;
    expect(
      recorded,
      'the inventory records no configHash at all, so nothing can be judged',
    ).toBeDefined();

    const current = hashOf('eslint.real-source.config.mjs');

    const out = execFileSync('npx', ['tsx', 'scripts/rule-case-ledger.ts'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 240_000,
    });

    if (recorded === current) {
      // The branch the bug made unreachable.
      expect(
        out,
        'config hash matches the inventory, so the ledger must report the ' +
          'real-code numbers. Printing STALE here means the comparison is ' +
          'broken — most likely a thrown error swallowed by a catch, which is ' +
          'how this failed the first time.',
      ).toContain('fires on real code');
      expect(out).toContain('scanned and never fired');
      expect(out).not.toContain(
        'real-code inventory                     STALE',
      );
    } else {
      expect(
        out,
        'the config has changed since the inventory was produced, so the ' +
          'ledger must refuse to report numbers for an instrument it is not ' +
          'holding. Regenerate in CI — real-source-scan is never run on a ' +
          'developer machine.',
      ).toContain('STALE');
    }
  }, 300_000);
});
