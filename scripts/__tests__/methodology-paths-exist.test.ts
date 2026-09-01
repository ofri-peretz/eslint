/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A preregistration can only pin files that exist.
 *
 * `DEFAULT_METHODOLOGY_PATHS` is the list whose contents are hashed into
 * `methodologyHash`, so that a later run can prove the methodology did not move
 * underneath it. `captureMethodology` hashes what it can find and skips what it
 * cannot, which means a path that stops existing degrades the guarantee in
 * SILENCE — the hash still computes, still looks stable, and is stable
 * precisely because it is now covering less.
 *
 * That happened. The mjs -> ts codemod renamed `benchmarks/score.mjs`,
 * `scripts/ilb-wild.mjs` and `scripts/ilb-validate-fixtures.mjs` without
 * moving this list, so for every run after it the hash was blind to the
 * scorer itself.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SOURCE = join(ROOT, 'benchmarks', 'lib', 'preregister.ts');

/** The literal entries of `DEFAULT_METHODOLOGY_PATHS`. */
function methodologyPaths(): string[] {
  const text = readFileSync(SOURCE, 'utf8');
  const block = /const DEFAULT_METHODOLOGY_PATHS = \[([\s\S]*?)\];/.exec(text);
  if (block === null) throw new Error('DEFAULT_METHODOLOGY_PATHS not found');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('every hashed methodology path is a real path', () => {
  it('finds the list at all', () => {
    // A renamed constant would make the assertion below pass over nothing.
    expect(methodologyPaths().length).toBeGreaterThanOrEqual(5);
  });

  it('has no entry that does not exist', () => {
    const missing = methodologyPaths().filter((p) => !existsSync(join(ROOT, p)));
    expect(
      missing,
      'these are hashed into methodologyHash but do not exist, so they ' +
        'contribute nothing and the hash silently covers less than it claims',
    ).toEqual([]);
  });
});
