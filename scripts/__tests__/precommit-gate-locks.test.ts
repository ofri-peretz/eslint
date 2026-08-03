/**
 * Regression locks — nothing slow and unbounded gates a local commit.
 *
 * Both bugs locked here are the same shape: a test whose real cost is
 * filesystem/module I/O, sitting behind a fixed timeout that was sized off the
 * *warm* case, inside the lefthook `tests-affected` pre-commit hook. On a cold
 * cache the work overruns, the file fails, and a commit that touched none of it
 * is blocked. The rule this file enforces: size ceilings off cold observation,
 * and keep third-party-surface tests out of the commit path entirely.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG 1 — SDK compatibility suites in the default test run (2026-08-02)
 * The seven `packages/*&#47;src/__compatibility__/*.spec.ts` suites each loaded
 * their third-party SDK inside a `beforeAll` hook. On a cold module cache
 * (fresh worktree + `npm ci`, OS page cache cold) that load was measured at
 * 82s for express and 209s for @nestjs/common. The hook blew its timeout,
 * vitest reported every test in the file as skipped, the package's `npm test`
 * failed — and because these suites are in the default include, that failure
 * reached the lefthook `tests-affected` pre-commit hook and blocked unrelated
 * commits (twice on a markdown-only docs change).
 *
 * THE FIX, IN THREE PARTS — each asserted below:
 *   1. Every package config excludes `src/__compatibility__/**`, so the suites
 *      never run under `turbo run test` / pre-commit.
 *   2. No suite carries its own hook timeout. The ceiling lives once in
 *      `vitest.compat.config.mts`, sized off the observed *cold* numbers.
 *      Per-file ceilings are how this stayed broken: nestjs-security already
 *      passed 30s and still blew it on a 209s load.
 *   3. `sdk-compatibility.yml` runs them via `vitest.compat.config.mts`. This
 *      one matters most: vitest CLI positionals *filter* the config's include,
 *      they don't add to it. Drop the `--config` flag and the workflow silently
 *      matches zero files — green, and testing nothing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG 2 — no-deprecated-plugin-references.test.ts (2026-08-02)
 * Two whole-repo `grep -r` scans running under vitest's 5000ms default. Warm
 * they take ~1–3s; cold the import scan was measured at 7.4s, so the file
 * failed on a cold cache and blocked unrelated commits. Fixed by declaring an
 * explicit timeout sized off the cold number, and by excluding `.git` from the
 * scan (2658ms → 886ms cold in a normal clone).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG 3 — eslint-formatter's real-ESLint handshake test (2026-08-02)
 * `await import('eslint')` inside the test: ~1.3s warm, 10.3s cold, again past
 * the 5000ms default. Same fix — an explicit timeout on the `it(...)`.
 *
 * Revert any part and this test goes red.
 */

import { describe, it, expect } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const COMPAT_CONFIG = 'vitest.compat.config.mts';
const EXCLUDE_PATTERN = "'src/__compatibility__/**'";

const read = (relPath: string) =>
  readFileSync(resolve(REPO_ROOT, relPath), 'utf8');

const compatSpecs = globSync('packages/*/src/__compatibility__/**/*.spec.ts', {
  cwd: REPO_ROOT,
}).sort();

describe('SDK compatibility suites are isolated from the default test run', () => {
  it('finds the compat suites (guards against the glob silently going stale)', () => {
    expect(compatSpecs.length).toBeGreaterThanOrEqual(7);
  });

  describe.each(compatSpecs)('%s', (spec) => {
    const pkgDir = spec.slice(0, spec.indexOf('/src/'));

    it("its package's vitest config excludes src/__compatibility__/**", () => {
      const config = read(`${pkgDir}/vitest.config.mts`);
      expect(
        config,
        `${pkgDir}/vitest.config.mts must list ${EXCLUDE_PATTERN} in test.exclude — ` +
          'otherwise this SDK suite runs on every `npm test` and can block pre-commit.',
      ).toContain(EXCLUDE_PATTERN);
    });

    it('sets no per-file hook timeout, deferring to the compat config', () => {
      const source = read(spec);
      expect(
        source,
        'A timeout argument on `beforeAll` overrides vitest.compat.config.mts ' +
          "and re-creates the bug: nestjs-security's own 30s ceiling still blew " +
          'on a 209s cold load, and a blown hook reports every test in the file ' +
          'as skipped. Size the ceiling once, in the compat config.',
      ).not.toMatch(/^\}, \d/m);
    });
  });

  it('the compat config globs every compat suite', () => {
    expect(read(COMPAT_CONFIG)).toContain(
      "'packages/*/src/__compatibility__/**/*.spec.ts'",
    );
  });

  it('the compat config fails loudly on an empty match', () => {
    // passWithNoTests: true here would turn a broken glob into a green run.
    expect(read(COMPAT_CONFIG)).toContain('passWithNoTests: false');
  });

  it('sdk-compatibility.yml runs the suites through the compat config', () => {
    const workflow = read('.github/workflows/sdk-compatibility.yml');
    expect(
      workflow,
      'Without `--config vitest.compat.config.mts` the workflow inherits an ' +
        'include that excludes these files and silently tests nothing.',
    ).toContain(`--config ${COMPAT_CONFIG}`);
  });

  it('sdk-compatibility.yml filters by literal path, not by glob', () => {
    const workflow = read('.github/workflows/sdk-compatibility.yml');
    expect(
      workflow,
      'Vitest 4 treats CLI positionals as substring filters, not globs. A ' +
        '`**/*.spec.ts` argument matches nothing — which is how this workflow ' +
        'passed while testing zero SDKs before 2026-08-02.',
    ).not.toMatch(/^\s*"\$PLUGIN_PATH.*\*.*"\s*\\?$/m);
    expect(workflow).toContain('"$PLUGIN_PATH/src/__compatibility__" \\');
  });
});

describe('whole-repo scan tests declare a cold-sized timeout', () => {
  const SCAN_TEST =
    'packages/eslint-devkit/src/tests/no-deprecated-plugin-references.test.ts';

  it('no-deprecated-plugin-references sets an explicit scan timeout', () => {
    const source = read(SCAN_TEST);
    expect(
      source,
      "This file shells out to two whole-repo greps. On vitest's 5000ms " +
        'default it failed on a cold page cache (7.4s measured) and blocked ' +
        'the pre-commit hook for unrelated commits. Keep an explicit timeout ' +
        'sized off the cold number.',
    ).toMatch(/const SCAN_TIMEOUT_MS = \d[\d_]*;/);

    const declared = Number(
      /const SCAN_TIMEOUT_MS = ([\d_]+);/.exec(source)?.[1].replace(/_/g, ''),
    );
    expect(
      declared,
      'A ceiling at or below 10s is the warm-case sizing that caused the bug.',
    ).toBeGreaterThanOrEqual(30_000);

    // Both `it(...)` calls must actually pass it — declaring the constant and
    // forgetting to use it would leave the 5000ms default in place.
    expect(source.match(/^\s*SCAN_TIMEOUT_MS,$/gm) ?? []).toHaveLength(2);
  });

  it('the real-ESLint handshake test budgets for a cold eslint import', () => {
    const source = read('packages/eslint-formatter/src/index.test.ts');
    const block = source.slice(
      source.indexOf("describe('integration: real ESLint -f handshake'"),
    );
    expect(
      block,
      "This test does `await import('eslint')` — ~1.3s warm, 10.3s cold, past " +
        "vitest's 5000ms default. Keep an explicit timeout on the `it(...)`.",
    ).toMatch(/\}, \d{2}_?\d{3}\);/);
  });

  it('the repo scan skips .git', () => {
    expect(
      read(SCAN_TEST),
      'grep -r walks every loose object and packfile in .git before the ' +
        '--include filter rejects them: 2658ms → 886ms cold once excluded.',
    ).toContain("'--exclude-dir=.git'");
  });
});
