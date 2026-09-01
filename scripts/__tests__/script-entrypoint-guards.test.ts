/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: a script that both exports helpers and runs a gate must guard its entry.
 *
 * Without the guard, importing the module to test one exported function runs the
 * whole gate. These gates end in `process.exit(1)`, so the import takes the
 * vitest worker down with it — surfacing as
 * `Error: process.exit unexpectedly called with "1"` and failing every test in
 * the file, including the ones that never touched the gate.
 *
 * That is not hypothetical: it blocked PR #739 (job 99316918540, step
 * `Run scripts/__tests__`) with both `check-intent` and `check-new-rule-cases`
 * failing that way. The tests passed when run alone and failed in the full
 * suite, which is the signature of an import-time side effect and the reason it
 * is worth a lock rather than a fix and a hope.
 *
 * The guarded list is deliberately explicit. A glob over `scripts/*.ts` would
 * sweep in the many scripts that are pure CLIs with nothing exported, where a
 * top-level body is correct and a guard would be noise.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCRIPTS_DIR = resolve(__dirname, '..');

/** Scripts that export something AND run a gate. Both halves are why they qualify. */
const DUAL_PURPOSE = [
  'check-intent',
  'check-new-rule-cases',
  'lint-changesets',
];

describe('scripts that are both importable and executable', () => {
  it.each(DUAL_PURPOSE)('%s.ts guards its entrypoint', (name) => {
    const file = join(SCRIPTS_DIR, `${name}.ts`);
    if (!existsSync(file)) {
      // The script may not exist on every branch. Skipping silently would make
      // this lock vacuous, so say so out loud instead.
      throw new Error(
        `${name}.ts is listed as dual-purpose but does not exist at ${file}. ` +
          'Remove it from DUAL_PURPOSE or restore the file.',
      );
    }
    const source = readFileSync(file, 'utf-8');

    // Two accepted spellings: a hoisted IS_ENTRYPOINT constant, or the inline
    // `if (process.argv[1]...endsWith(...)) main()` form lint-changesets uses.
    const guarded =
      /process\.argv\[1\]\s*(?:\?\.|&&[^\n]*\.)?endsWith\(/.test(source) ||
      /IS_ENTRYPOINT/.test(source);

    expect(
      guarded,
      `${name}.ts runs at import time. Guard it, or importing it for a test ` +
        'will execute the gate and process.exit out of the vitest worker.',
    ).toBe(true);
  });

  it('every guarded script names its own filename in the guard', () => {
    // A guard checking the wrong filename never fires, which reads as "guarded"
    // to any scan that only looks for the shape.
    for (const name of DUAL_PURPOSE) {
      const file = join(SCRIPTS_DIR, `${name}.ts`);
      if (!existsSync(file)) continue;
      const source = readFileSync(file, 'utf-8');
      expect(source, `${name}.ts guard does not mention ${name}.ts`).toContain(
        `${name}.ts'`,
      );
    }
  });
});
