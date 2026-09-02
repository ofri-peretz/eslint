/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A non-zero exit from ESLint is a finished scan, not a failed one.
 *
 * ESLint exits 1 whenever it reports anything, so on a corpus scan — whose
 * entire purpose is to report things — exit 1 is the SUCCESS case and the
 * findings arrive on `error.stdout`. `scanTarget` has recovered them that way
 * since 2026-08-12 (#533).
 *
 * On 2026-08-31 (#739) `sh()` gained a wrapper that rethrows a NEW Error
 * carrying only message text, to stop failures reporting a command line and no
 * cause. Correct on its own, and it dropped `stdout` — so the recovery below it
 * saw nothing to recover and rethrew for every target. A scan producing 3,474
 * findings across 900 files of Shopify/cli reported:
 *
 *     every target failed to scan — no findings were measured
 *
 * Green-looking budgets on an instrument that measured nothing, on every
 * rule-logic PR at once. Two correct fixes, the second silently disabling the
 * first.
 *
 * The module calls `process.exit(main())` at import, so it cannot be imported
 * to exercise `sh` directly. Both halves of the contract are pinned here
 * instead — the producer attaching the streams and the consumer reading them —
 * because the defect was precisely these two drifting apart.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  path.join(import.meta.dirname, '..', 'corpus-scan.ts'),
  'utf-8',
);

describe('corpus-scan preserves the child process streams', () => {
  it('sh() re-attaches stdout and stderr to the error it throws', () => {
    // Without this, every `error.stdout` reader below it is dead code.
    expect(SOURCE).toMatch(
      /Object\.assign\(\s*wrapped\s*,\s*\{[^}]*stdout[^}]*\}/,
    );
    expect(SOURCE).toMatch(
      /Object\.assign\(\s*wrapped\s*,\s*\{[^}]*stderr[^}]*\}/,
    );
  });

  it('sh() throws the wrapped error, not a bare one that loses the streams', () => {
    expect(SOURCE).toContain('throw wrapped;');
    // The pre-fix shape: constructing and throwing in one expression leaves no
    // reference to attach the streams to.
    expect(SOURCE).not.toMatch(/throw new Error\(\s*`\$\{child\.message/);
  });

  it('scanTarget still recovers a scan from a non-zero exit', () => {
    // The consumer half. If this recovery is ever removed, the producer above
    // becomes pointless and a real ESLint exit-1 becomes a hard failure again.
    const scanTarget = SOURCE.slice(SOURCE.indexOf('function scanTarget('));
    expect(scanTarget).toMatch(/\(error as \{ stdout\?: string \}\)\.stdout/);
    expect(scanTarget).toContain('if (!stdout) throw error;');
  });
});
