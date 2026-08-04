/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared `allowInTests` predicate.
 *
 * A `*.test.ts` suffix is only half of how test code is laid out. Fixtures,
 * testcontainers helpers and e2e harnesses live in `test/` or `__tests__/`
 * directories under ordinary filenames, and holding a throwaway container to
 * production TLS/auth policy is pure noise.
 */
const TEST_DIRS = new Set(['test', 'tests', '__tests__', '__mocks__', 'e2e', 'fixtures']);

export function isTestFile(filename: string): boolean {
  if (/\.(test|spec|e2e-spec)\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(filename)) return true;
  return filename
    .split(/[\\/]/)
    .slice(0, -1)
    .some((segment) => TEST_DIRS.has(segment));
}
