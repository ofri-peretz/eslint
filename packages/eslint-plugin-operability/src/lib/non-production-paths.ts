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
 *
 * `bin` was in this list and has been removed. A published package very often
 * delivers its CLI entry point from `bin/cli.js` — that file runs on end-user
 * machines, so it ships, and exempting it would hide CWE-489 in exactly the
 * code a user executes. It failed the rule this list is supposed to follow.
 */
export const NON_PRODUCTION_SEGMENTS: readonly string[] = [
  'scripts',
  'tools',
  'env',
  'benchmarks',
  'examples',
  'example',
  'demo',
  'fixtures',
];

/**
 * Build-tool configuration, matched by the tool's OWN name.
 *
 * Not `*.config.*`. That pattern matches at any depth and would swallow
 * `src/database.config.ts` or `packages/api/src/server.config.ts`, which are
 * runtime modules in the NestJS and Express conventions — a false negative in
 * the exact code that ships. The doc comment here used to say "top-level",
 * which the implementation did not enforce.
 *
 * A closed list of build tools is checkable and cannot drift into runtime code.
 */
const BUILD_CONFIG_BASENAMES =
  /^(eslint|jest|vite|vitest|rollup|webpack|tsup|next|babel|karma|nuxt|astro|svelte|tailwind|postcss|playwright|cypress|commitlint|lint-staged|release|changeset|turbo|nx)\.config\.(js|cjs|mjs|ts|mts|cts)$/;

/**
 * Does this file sit inside a directory that never ships, or is it build-tool
 * configuration?
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
  return BUILD_CONFIG_BASENAMES.test(base) || /^(Gruntfile|Gulpfile)\./i.test(base);
}
