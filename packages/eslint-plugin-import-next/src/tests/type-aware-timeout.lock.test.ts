/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: every type-aware suite in this package runs its cases with a timeout
 * that survives the coverage run.
 *
 * `named.test.ts`, `default.test.ts` and `namespace.test.ts` each build a
 * TypeScript program through `projectService`, and the first case in each
 * absorbs that cost. Under `codecov.yml` (turbo fan-out of every package's
 * `test:coverage`, v8 instrumentation on) that is exactly what made
 * `eslint-plugin-nestjs-security`'s own type-aware suite exceed its
 * package's 30s `testTimeout` (#817, fixed in that package by registering
 * RuleTester's `it` with a case timeout of at least 60s). This package is
 * the only other one using `projectService` in its tests, and had not
 * received the same fix (#879).
 *
 * Sabotage proof: set `RuleTester.it = it` again in any of the three files,
 * or lower a constant below 60_000, and this test fails.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TYPE_AWARE_FILES = [
  'named.test.ts',
  'default.test.ts',
  'namespace.test.ts',
];

describe.each(TYPE_AWARE_FILES)('%s case timeout', (file) => {
  const source = readFileSync(resolve(__dirname, file), 'utf-8');

  it('declares a TYPE_AWARE_CASE_TIMEOUT_MS constant', () => {
    const constant = source.match(
      /const TYPE_AWARE_CASE_TIMEOUT_MS = ([\d_]+);/,
    );
    expect(
      constant,
      `${file} must declare TYPE_AWARE_CASE_TIMEOUT_MS`,
    ).not.toBeNull();
    const ms = Number(constant![1].replace(/_/g, ''));
    expect(
      ms,
      `${file}'s type-aware case timeout must be at least 60_000ms — 30s ` +
        'is what timed out nestjs-security under the coverage run (#817)',
    ).toBeGreaterThanOrEqual(60_000);
  });

  it('registers RuleTester.it with the type-aware case timeout', () => {
    expect(source).toMatch(
      /RuleTester\.it = \(text, callback\) =>\s*it\(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS\)/,
    );
    expect(source).not.toMatch(/^RuleTester\.it = it;$/m);
  });
});
