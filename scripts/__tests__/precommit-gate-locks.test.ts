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
 * BUG 2 — environment-bound suites on vitest's 5000ms default (2026-08-02)
 * The devkit repo-scan suites (two whole-repo greps; 7.4s measured cold) and
 * eslint-formatter's real-ESLint handshake (`await import('eslint')`: 1.3s warm,
 * 10.3s cold). #324 fixed the two devkit files with a suite-level
 * `{ timeout: 30_000 }`; the formatter needed the same and is fixed here. The
 * second block below locks all three to that idiom, so the next suite that
 * shells out or cold-imports doesn't have to rediscover this.
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
      const why =
        'A timeout argument on `beforeAll` overrides vitest.compat.config.mts ' +
        "and re-creates the bug: nestjs-security's own 30s ceiling still blew " +
        'on a 209s cold load, and a blown hook reports every test in the file ' +
        'as skipped. Size the ceiling once, in the compat config.';

      // Two patterns rather than one, because a hook's closing `}, 30_000)`
      // can sit at column 0, be indented inside a `describe`, or share a line
      // with the whole hook body. Matching per-line keeps both anchored — a
      // single `[\s\S]*?` bridge from `beforeAll(` would happily scan past the
      // hook's real end and match an unrelated `}, 5` later in the file.
      expect(source, why).not.toMatch(/^\s*\}\s*,\s*\d[\d_]*\s*\)/m); // multi-line close, any indent
      expect(source, why).not.toMatch(/\bbeforeAll\(.*\}\s*,\s*\d/); // all on one line
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

/**
 * Suites whose cost is environment, not assertions — a whole-repo `grep`, a cold
 * `import('eslint')`. Each must carry a suite-level `{ timeout }` of at least
 * 30s. The idiom is the one #324 established:
 *
 *   describe('name', { timeout: 30_000 }, () => { ... })
 *
 * One declaration covers every test in the file, so adding a test can't
 * silently reintroduce the 5s default the way a per-`it(...)` argument can.
 */
describe('environment-bound suites declare a suite-level timeout', () => {
  const SUITES: Array<{ file: string; suite: string; why: string }> = [
    {
      file: 'packages/eslint-devkit/src/tests/no-deprecated-plugin-references.test.ts',
      suite: 'No Deprecated Plugin References',
      why: 'two whole-repo greps; 7.4s measured cold, worse under parallel load',
    },
    {
      file: 'packages/eslint-devkit/src/tests/documentation-standards.test.ts',
      suite: 'Documentation Standards',
      why: 'every test shells out to a whole-repo grep',
    },
    {
      file: 'packages/eslint-formatter/src/index.test.ts',
      suite: 'integration: real ESLint -f handshake',
      why: "await import('eslint'); 1.3s warm, 10.3s cold",
    },
  ];

  it.each(SUITES)('$suite', ({ file, suite, why }) => {
    const source = read(file);
    const declaration = new RegExp(
      `describe\\(\\s*'${suite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*\\{[^}]*timeout:\\s*([\\d_]+)`,
    ).exec(source);

    expect(
      declaration,
      `${file} → describe('${suite}', { timeout: N }, ...) is missing. This ` +
        `suite is I/O-bound (${why}), so vitest's 5000ms default fails it on a ` +
        'cold or loaded machine and blocks commits that touched nothing here.',
    ).not.toBeNull();

    expect(
      Number(declaration![1].replace(/_/g, '')),
      'Below 30s is warm-case sizing — the mistake that caused the bug.',
    ).toBeGreaterThanOrEqual(30_000);
  });
});
