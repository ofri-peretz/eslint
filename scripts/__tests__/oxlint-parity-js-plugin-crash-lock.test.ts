/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/run.ts","find":"if ((d.message ?? '').startsWith('Error running JS plugin')) {","replace":"if (false) {"}
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/run.ts","find":"    if (jsPluginCrashes.length > 0) {\n      console.log(`  ✗ FAIL — a JS plugin rule crashed under oxlint.`);\n      process.exit(1);\n    }\n","replace":""}
 */

/**
 * A JS-plugin rule that THROWS under oxlint must fail the parity bench.
 *
 * oxlint reports the crash as a diagnostic with no `code` —
 * "Error running JS plugin.\nFile path: ...\nTypeError: ..." — and aborts every
 * JS rule on that file. `lintOxlint` parsed only `code`, so the crash was
 * dropped. On a file where ESLint also reports nothing, the two sides agree on
 * zero findings and parity reads 100%. Issue #1147 (detect-object-injection
 * reading `.typeAnnotation` off oxc's `null`) surfaced only because other rules
 * happened to fire on the same fixture.
 *
 * This runs the REAL run.ts, against the REAL oxlint binary, in a throwaway
 * tree: a manifest naming one plugin whose rule throws, an ESLint config with
 * no rules, and one fixture. No finding exists on either side, so only crash
 * detection can make `--ci` fail.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SUITE = 'benchmarks/suites/ilb-oxlint-parity';

let tree: string;
// Each case spawns tsx, ESLint and oxlint; a cold start overran vitest's 5s default.
const SPAWN_TIMEOUT = 120_000;

function write(rel: string, body: string) {
  const full = join(tree, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body);
}

function runBench(corpus: string) {
  const res = spawnSync(
    join(ROOT, 'node_modules', '.bin', 'tsx'),
    [
      join(tree, SUITE, 'run.ts'),
      '--ci',
      '--corpus',
      join(tree, corpus),
      '--config',
      join(tree, 'eslint.config.mjs'),
      '--plugins',
      'crash-lock',
    ],
    { cwd: tree, encoding: 'utf8', timeout: SPAWN_TIMEOUT },
  );
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

function envelope(corpus: string) {
  const dir = join(tree, 'benchmarks/results/ilb-oxlint-parity');
  return readdirSync(dir)
    .filter((f) => /^\d{4}-.*\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .find((e) => e.corpus === corpus);
}

describe('ilb-oxlint-parity fails when a JS plugin rule crashes (issue #1147)', () => {
  beforeAll(() => {
    // realpath: macOS tmpdir is a symlink, and oxlint reports resolved paths.
    tree = realpathSync(mkdtempSync(join(tmpdir(), 'oxlint-crash-lock-')));
    mkdirSync(join(tree, SUITE), { recursive: true });
    copyFileSync(join(ROOT, SUITE, 'run.ts'), join(tree, SUITE, 'run.ts'));
    /*
     * COPIED, not symlinked: preregister.ts finds its repo from its own path.
     * Through a symlink that is the real checkout, and `--ci` refuses a dirty
     * run.ts there — so every @provenBy mutation would fail for that reason
     * and prove nothing. Copied, it sits outside any git repo and records that.
     */
    cpSync(join(ROOT, 'benchmarks/lib'), join(tree, 'benchmarks/lib'), {
      recursive: true,
    });
    symlinkSync(join(ROOT, 'node_modules'), join(tree, 'node_modules'));
    // run.ts refuses to start without built plugins; it only checks this path.
    write('packages/eslint-plugin-postgresql-security/dist/src/index.js', '');
    write(
      '.agent/oxlint-jsplugins-manifest.json',
      JSON.stringify({
        plugins: [
          { short: 'crash-lock', shim: 'crash-lock.cjs', ruleCount: 1 },
        ],
      }),
    );
    // The #1147 shape: oxc sets an absent annotation to null, not undefined.
    write(
      'crash-lock.cjs',
      `module.exports = { meta: { name: 'crash-lock' }, rules: { boom: { create() {
        return { Identifier(n) { if (n.name === 'kaboom') n.typeAnnotation.typeAnnotation; } };
      } } } };\n`,
    );
    write('eslint.config.mjs', 'export default [];\n');
    write('corpus-clean/valid.js', 'const fine = 1;\n');
    write('corpus-crash/valid.js', 'const kaboom = 1;\n');
  });

  afterAll(() => {
    if (tree) rmSync(tree, { recursive: true, force: true });
  });

  it(
    'passes a corpus where the rule does not throw (the tree itself is sound)',
    { timeout: SPAWN_TIMEOUT },
    () => {
      const { status, out } = runBench('corpus-clean');
      expect(status, out).toBe(0);
      expect(out).toContain('PASS');
    },
  );

  it(
    'fails --ci, names the file and the error, and records it in the envelope',
    { timeout: SPAWN_TIMEOUT },
    () => {
      const { status, out } = runBench('corpus-crash');
      expect(
        status,
        `a crashing rule on a file with no findings must fail --ci:\n${out}`,
      ).toBe(1);
      expect(out).toContain(
        "corpus-crash/valid.js  TypeError: Cannot read properties of null (reading 'typeAnnotation')",
      );
      expect(envelope('corpus-crash')?.jsPluginCrashes).toEqual([
        {
          file: 'corpus-crash/valid.js',
          error:
            "TypeError: Cannot read properties of null (reading 'typeAnnotation')",
        },
      ]);
    },
  );
});
