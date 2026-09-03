/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: the type-aware suite runs its cases with a timeout that survives the
 * coverage run.
 *
 * `type-aware.test.ts` builds a TypeScript program per run; the first case
 * absorbs that cost. Under `codecov.yml` (turbo fan-out of every package's
 * `test:coverage`, v8 instrumentation on) that case exceeded the package's
 * 30s `testTimeout` (run 33717568270), the coverage upload failed, and #817
 * was filed. The fix registers RuleTester's `it` with a case timeout of at
 * least 60s.
 *
 * Sabotage proof: set `RuleTester.it = it` again, or lower the constant below
 * 60_000, and "registers RuleTester.it with a type-aware case timeout" fails.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(__dirname, 'type-aware.test.ts'), 'utf-8');

describe('type-aware.test.ts case timeout', () => {
  it('registers RuleTester.it with a type-aware case timeout of at least 60s', () => {
    const constant = SOURCE.match(/const TYPE_AWARE_CASE_TIMEOUT_MS = ([\d_]+);/);
    expect(
      constant,
      'type-aware.test.ts must declare TYPE_AWARE_CASE_TIMEOUT_MS',
    ).not.toBeNull();
    const ms = Number(constant![1].replace(/_/g, ''));
    expect(
      ms,
      'the type-aware case timeout must be at least 60_000ms — 30s is what ' +
        'timed out under the coverage run (#817)',
    ).toBeGreaterThanOrEqual(60_000);
    expect(
      SOURCE,
      'RuleTester.it must pass TYPE_AWARE_CASE_TIMEOUT_MS to vitest\'s it()',
    ).toMatch(/RuleTester\.it = \(text, callback\) =>\s*it\(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS\)/);
    expect(SOURCE).not.toMatch(/^RuleTester\.it = it;$/m);
  });
});
