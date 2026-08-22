/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Directories whose contents are not the shipped application.
 *
 * `no-console-log` and `no-debug-code-in-production` both report a
 * `console.log`, under two different framings, and neither had any notion that
 * a repository contains code which never reaches production. On the pinned
 * 8-repository corpus that was 107 and 120 findings respectively, largely the
 * SAME lines: okta-auth-js `env/index.js:22` and `scripts/verify-package.js`,
 * which are a build script and an environment loader.
 *
 * Matched by path SEGMENT rather than by prefix, because a repository is linted
 * from an absolute path — `/Users/x/repo/scripts/build.js` does not start with
 * `scripts/`, and a prefix test would silently never fire.
 *
 * Deliberately NOT here: `src`, `lib`, `app`, or anything that could plausibly
 * ship. And `test` is absent too — both rules already have their own test-file
 * handling, and duplicating it here would put the same decision in two places.
 */
export const NON_PRODUCTION_SEGMENTS: readonly string[] = [
  'scripts',
  'bin',
  'tools',
  'env',
  'benchmarks',
  'examples',
  'example',
  'demo',
  'fixtures',
];

/**
 * Does this file sit inside a directory that never ships?
 *
 * Also matches a top-level config file — `eslint.config.mjs`, `jest.config.js`,
 * `vite.config.ts` — which is build configuration rather than application code
 * and is where a `console.log` is a deliberate build-time message.
 */
export function isNonProductionPath(
  filename: string,
  segments: readonly string[] = NON_PRODUCTION_SEGMENTS,
): boolean {
  const normalized = filename.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.some((part) => segments.includes(part))) return true;
  // `split` always yields at least one element, so no fallback here — it would
  // be a branch no input can take.
  const base = parts[parts.length - 1] as string;
  return /\.config\.(js|cjs|mjs|ts|mts|cts)$/.test(base) || /^[Gg]runtfile\./.test(base);
}
