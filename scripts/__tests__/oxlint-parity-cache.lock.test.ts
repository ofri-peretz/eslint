/**
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/cache-key.ts","find":"  tree('src:devkit', path.join(devkit, 'src'), isSrc);\n","replace":""}
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/cache-key.ts","find":"  file('harness', path.join(suite, 'allowlist.json'));\n","replace":""}
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/run.ts","find":"  if (CI || CACHED) {","replace":"  if (CI) {"}
 * @provenBy {"file":".github/workflows/oxlint-parity.yml","find":"run: npm run ilb:oxlint-parity:ci","replace":"run: npm run ilb:oxlint-parity:cached"}
 *
 * Lock: a cached oxlint-parity `pass` implies a fresh run on the same inputs
 * would pass — and CI does not take the cache's word for it.
 *
 * What was wrong on main (2026-10-12):
 *
 * 1. The cache key hashed plugin src, the oxlint bundles and the corpus. It
 *    left out @interlace/eslint-devkit (imported by every rule), the shims in
 *    tools/oxlint-plugins, the built dist oxlint actually loads, run.ts,
 *    allowlist.json, the shim manifest, the ESLint bench config and the
 *    eslint/oxlint versions. Change any of them and a recorded `pass` was
 *    still served.
 * 2. `--cached` never exited non-zero: the verdict exits were `if (CI)` only.
 *    Run 38154358916 (scheduled, main) missed the cache, found two unexplained
 *    node-security/lock-file divergences, and the job passed.
 * 3. The scheduled job ran `--cached` against `.agent/oxlint-parity-cache.json`,
 *    a file written by local runs and committed.
 *
 * Sabotage proof: drop any input from cache-key.ts and its case below fails;
 * revert the exit gate to `if (CI)` or point the workflow back at `:cached`
 * and the structural cases fail.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { computeParityCacheKey } from '../../benchmarks/suites/ilb-oxlint-parity/cache-key.ts';

const REPO_ROOT = resolve(__dirname, '..', '..');

let root: string;

function put(rel: string, content: string) {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

const key = () =>
  computeParityCacheKey({
    repoRoot: root,
    plugins: ['node-security'],
    corpus: join(root, 'benchmarks', 'corpus'),
    threshold: 0.95,
    eslintConfig: join(root, 'eslint.benchmark.config.mjs'),
  });

const SUITE = 'benchmarks/suites/ilb-oxlint-parity';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'parity-key-'));
  put(
    'packages/eslint-plugin-node-security/src/rules/lock-file.ts',
    'export const rule = 1;',
  );
  put(
    'packages/eslint-plugin-node-security/dist/src/rules/lock-file.js',
    'exports.rule = 1;',
  );
  put('packages/eslint-devkit/src/index.ts', 'export const v = 1;');
  put('packages/eslint-devkit/dist/src/index.js', 'exports.v = 1;');
  put(
    'tools/oxlint-plugins/interlace-node-security.cjs',
    'module.exports = {};',
  );
  put('node_modules/eslint/package.json', '{"version":"10.0.0"}');
  put('node_modules/oxlint/package.json', '{"version":"1.0.0"}');
  put('node_modules/oxlint/dist/plugins.js', '/* oxlint */');
  put(`${SUITE}/run.ts`, '// harness');
  put(`${SUITE}/cache-key.ts`, '// key');
  put(`${SUITE}/finding-key.ts`, '// finding key');
  put(`${SUITE}/allowlist.json`, '{"entries":[]}');
  put('.agent/oxlint-jsplugins-manifest.json', '{"plugins":[]}');
  put('eslint.benchmark.config.mjs', 'export default [];');
  put('benchmarks/corpus/CWE-1/case-01.js', 'eval(x);');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('oxlint parity cache key covers every input that decides the verdict', () => {
  it('is deterministic for an unchanged tree', () => {
    expect(key()).toBe(key());
  });

  const inputs: [string, string, string][] = [
    [
      'a plugin source file',
      'packages/eslint-plugin-node-security/src/rules/lock-file.ts',
      'export const rule = 2;',
    ],
    [
      'the plugin dist oxlint loads',
      'packages/eslint-plugin-node-security/dist/src/rules/lock-file.js',
      'exports.rule = 2;',
    ],
    [
      '@interlace/eslint-devkit source',
      'packages/eslint-devkit/src/index.ts',
      'export const v = 2;',
    ],
    [
      '@interlace/eslint-devkit dist',
      'packages/eslint-devkit/dist/src/index.js',
      'exports.v = 2;',
    ],
    [
      'an oxlint shim',
      'tools/oxlint-plugins/interlace-node-security.cjs',
      'module.exports = { x: 1 };',
    ],
    [
      'the eslint version',
      'node_modules/eslint/package.json',
      '{"version":"10.0.1"}',
    ],
    [
      'the oxlint version',
      'node_modules/oxlint/package.json',
      '{"version":"1.0.1"}',
    ],
    [
      'an oxlint runtime bundle',
      'node_modules/oxlint/dist/plugins.js',
      '/* oxlint 2 */',
    ],
    ['the harness (run.ts)', `${SUITE}/run.ts`, '// harness v2'],
    ['the key function itself', `${SUITE}/cache-key.ts`, '// key v2'],
    [
      'how findings are matched',
      `${SUITE}/finding-key.ts`,
      '// finding key v2',
    ],
    ['the allowlist', `${SUITE}/allowlist.json`, '{"entries":[{"rule":"x"}]}'],
    [
      'the shim manifest',
      '.agent/oxlint-jsplugins-manifest.json',
      '{"plugins":[1]}',
    ],
    [
      'the ESLint bench config',
      'eslint.benchmark.config.mjs',
      'export default [{}];',
    ],
    ['a corpus fixture', 'benchmarks/corpus/CWE-1/case-01.js', 'eval(y);'],
    ['a new corpus fixture', 'benchmarks/corpus/CWE-1/case-02.js', 'eval(z);'],
  ];

  for (const [what, rel, next] of inputs) {
    it(`changes when ${what} changes`, () => {
      const before = key();
      put(rel, next);
      expect(key(), `${rel} is not in the parity cache key`).not.toBe(before);
    });
  }

  it('ignores plugin test files, which neither linter runs', () => {
    const before = key();
    put(
      'packages/eslint-plugin-node-security/src/rules/lock-file.test.ts',
      'it("x", () => {});',
    );
    expect(key()).toBe(before);
  });
});

describe('the parity verdict is enforced wherever the bench actually runs', () => {
  const runTs = readFileSync(resolve(REPO_ROOT, SUITE, 'run.ts'), 'utf8');
  const workflow = readFileSync(
    resolve(REPO_ROOT, '.github/workflows/oxlint-parity.yml'),
    'utf8',
  );

  it('run.ts exits non-zero on a failed --cached miss, not only under --ci', () => {
    expect(runTs).toMatch(
      /if \(CI \|\| CACHED\) \{\s*if \(jsPluginCrashes\.length > 0\)/,
    );
  });

  it('run.ts takes its key from cache-key.ts rather than an inline partial hash', () => {
    expect(runTs).toMatch(/from '\.\/cache-key\.ts'/);
    expect(runTs).not.toMatch(/createHash\(/);
  });

  it('CI never trusts the committed cache', () => {
    const steps = workflow
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'))
      .join('\n');
    expect(steps).not.toMatch(/ilb:oxlint-parity:cached/);
    expect(steps).not.toMatch(/--cached/);
    expect(steps).toMatch(/run: npm run ilb:oxlint-parity:ci/);
  });
});
