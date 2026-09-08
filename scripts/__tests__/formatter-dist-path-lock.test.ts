/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The two hardcoded consumers of the built `@interlace/eslint-formatter`
 * agree with the package's own `main` field on where its build lands.
 *
 * #928 moved the package's build output from a repo-root `dist/out-tsc/…`
 * (the pre-publish, tsc-project-references convention) to a package-relative
 * `dist/src/index.js` written by `build-package.ts` — the same convention
 * every other published package (`@interlace/eslint-devkit` included) uses.
 * `packages/eslint-formatter/package.json#main` was updated; the two scripts
 * that `require()` the built formatter directly were not, and kept resolving
 * to a path nothing ever wrote:
 *
 *   Error: Cannot find module '.../dist/out-tsc/packages/eslint-formatter/src/index.js'
 *
 * That broke `benchmarks/suites/ilb-formatter/runner.ts` (npm run
 * ilb:formatter) and `scripts/audit-cwe-rendering.ts` (npm run
 * audit:cwe-rendering) identically — both hardcode the path rather than
 * resolving it through `require.resolve('@interlace/eslint-formatter')`,
 * so neither a normal typecheck nor a `require`-not-found at import time
 * caught the drift; it only surfaces when the script actually runs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

const PACKAGE_MAIN: string = JSON.parse(
  readFileSync(join(ROOT, 'packages/eslint-formatter/package.json'), 'utf8'),
).main;

/** Absolute path `packages/eslint-formatter/package.json#main` resolves to. */
const CANONICAL_DIST = resolve(ROOT, 'packages/eslint-formatter', PACKAGE_MAIN);

const CONSUMERS = [
  {
    file: 'benchmarks/suites/ilb-formatter/runner.ts',
    // FORMATTER_DIST = resolve(HERE, '<path>'); HERE is this file's own dir.
    hereDir: 'benchmarks/suites/ilb-formatter',
    pattern: /FORMATTER_DIST = resolve\(\s*HERE,\s*'([^']+)'/,
  },
  {
    file: 'scripts/audit-cwe-rendering.ts',
    // FORMATTER_DIST = join(REPO_ROOT, '<path>'); REPO_ROOT is the repo root.
    hereDir: '.',
    pattern: /FORMATTER_DIST = join\(REPO_ROOT, '([^']+)'\)/,
  },
];

describe('the formatter dist path is the same everywhere it is hardcoded', () => {
  it('package.json#main points at a package-relative dist/src/*.js', () => {
    // Pins the convention itself, so a future change to it is a deliberate
    // edit to this test rather than a silent pass on a moved goalpost.
    expect(PACKAGE_MAIN).toBe('./dist/src/index.js');
  });

  for (const { file, hereDir, pattern } of CONSUMERS) {
    it(`${file} resolves FORMATTER_DIST to the same file`, () => {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const match = pattern.exec(src);
      expect(
        match,
        `${file} does not declare FORMATTER_DIST in the expected shape`,
      ).not.toBeNull();
      const resolved = resolve(ROOT, hereDir, match![1]);
      expect(resolved).toBe(CANONICAL_DIST);
    });
  }
});
