/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `.tsbuildinfo` and `dist` are one unit, or they are not cached at all.
 *
 * On 2026-09-01 the setup action cached `packages/*​/.tsbuildinfo` without
 * `packages/*​/dist` — dist having been dropped for size, which was a real
 * concern: it once took this repo's cache store to 36.89 GB against a 10 GB
 * budget, where GitHub LRU-evicts and `restore-keys` has nothing to fall back
 * to.
 *
 * But splitting them is incoherent. `tsgo --build` reads the buildinfo,
 * concludes every project is up to date, and skips emitting — so the `.d.ts`
 * files downstream projects reference are never written:
 *
 *   TS2307: Cannot find module '@interlace/eslint-devkit' or its
 *           corresponding type declarations
 *   TS7006: Parameter 'context' implicitly has an 'any' type
 *
 * That reads as a type error in a file nobody touched, which is what made it
 * expensive: the obvious diagnosis is "someone broke jwt-security", and the
 * actual cause is a cache path list two directories away.
 *
 * This asserts the invariant rather than the current decision: caching neither
 * is fine, caching both is fine, caching exactly one is the bug.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ACTION = resolve(__dirname, '..', '..', '.github/actions/setup/action.yml');

describe('tsbuildinfo and dist are cached together or not at all', () => {
  it('never caches one half without the other', () => {
    const yaml = readFileSync(ACTION, 'utf8');

    // Only real path entries count. The rationale comment names both paths on
    // purpose, and a comment-blind scan would read it as a violation — the
    // regression this file exists to prevent would then be undetectable from a
    // green run, which is the failure mode it is guarding against.
    const uncommented = yaml
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');

    const cachesBuildinfo = /^\s*packages\/\*\/\.tsbuildinfo\s*$/m.test(uncommented);
    const cachesDist = /^\s*packages\/\*\/dist\s*$/m.test(uncommented);

    expect(
      cachesBuildinfo === cachesDist,
      cachesBuildinfo
        ? 'packages/*/.tsbuildinfo is cached without packages/*/dist. tsgo --build will ' +
          'trust the buildinfo, skip emit, and downstream projects will fail to resolve ' +
          'their .d.ts — surfacing as TS2307/TS7006 in files nobody changed.'
        : 'packages/*/dist is cached without packages/*/.tsbuildinfo.',
    ).toBe(true);
  });

  it('does not declare a tsbuildinfo-cache input while caching nothing', () => {
    // A dangling input is how the half-cache came back the first time: the
    // knob still existed, so re-adding a path list looked like a restoration.
    const yaml = readFileSync(ACTION, 'utf8');
    const hasInput = /^\s{2}tsbuildinfo-cache:/m.test(yaml);
    const cachesAnything = /^\s*packages\/\*\/\.tsbuildinfo\s*$/m.test(
      yaml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n'),
    );
    expect(hasInput).toBe(cachesAnything);
  });
});
