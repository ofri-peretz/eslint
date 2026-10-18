/**
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/finding-key.ts","find":"    if (PROJECT_SCOPED_RULES.has(f.rule)) {","replace":"    if (false) {"}
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/finding-key.ts","find":"        return `${base}::project#${n}`;","replace":"        return base;"}
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/run.ts","find":"  return diffFindings(eslintFindings, oxlintFindings, REPO_ROOT);","replace":"  return { shared: 0, eslintOnly: eslintFindings, oxlintOnly: oxlintFindings };"}
 *
 * Lock: the oxlint-parity bench matches a project-scoped finding by PROJECT,
 * not by the file it happened to land on — and still counts it.
 *
 * `node-security/lock-file` reports "no lock file" once per package.json root
 * and suppresses it everywhere else in that project, so it lands on whichever
 * file the engine lints first. Neither ESLint nor oxlint lints in a fixed
 * order: on one 60-file project, 30 runs each on identical input, ESLint put
 * the single finding on 4 different files and oxlint on 9.
 *
 * The bench keyed every finding by (file, rule, line, column). The weekly
 * "Runtime smoke + parity" job printed, in 2 of 4 scheduled runs:
 *
 *   38154358916  eslint-only  lock-file/safe/case-03.js:9
 *                oxlint-only  lock-file/vulnerable/case-01.js:9
 *   35515111168  eslint-only  lock-file/vulnerable/case-01.js:9
 *                oxlint-only  lock-file/safe/case-03.js:9
 *
 * One finding, one project (benchmarks/package.json), both engines — placed
 * by two schedulers that disagreed. It never reproduced on the maintainer's
 * machine because a pnpm-lock.yaml above the checkout satisfies the rule, so
 * there was no finding to place.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  diffFindings,
  type Finding,
} from '../../benchmarks/suites/ilb-oxlint-parity/finding-key.ts';

const REPO_ROOT = resolve(__dirname, '../..');
const LOCK_FILE = 'node-security/lock-file';
const DIR = 'benchmarks/corpus/by-rule/node-security/lock-file';

let root: string;

beforeAll(() => {
  // The real corpus layout, under one project root of its own.
  root = mkdtempSync(join(tmpdir(), 'parity-project-scoped-'));
  for (const rel of [
    'benchmarks/package.json',
    'packages/other/package.json',
  ]) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), '{}');
  }
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const at = (file: string, rule = LOCK_FILE, line = 9): Finding => ({
  file,
  rule,
  line,
  column: 1,
});
const SAFE_03 = at(`${DIR}/safe/case-03.js`);
const VULN_01 = at(`${DIR}/vulnerable/case-01.js`);

describe('project-scoped findings are matched by project', () => {
  it('run 38154358916: ESLint on safe/case-03, oxlint on vulnerable/case-01 — agreement', () => {
    const d = diffFindings([SAFE_03], [VULN_01], root);
    expect(d.eslintOnly).toEqual([]);
    expect(d.oxlintOnly).toEqual([]);
    expect(d.shared).toBe(1);
  });

  it('run 35515111168: the same pair, swapped — agreement', () => {
    const d = diffFindings([VULN_01], [SAFE_03], root);
    expect(d.eslintOnly).toEqual([]);
    expect(d.oxlintOnly).toEqual([]);
  });

  it('a finding only one engine produced is still a divergence', () => {
    const d = diffFindings([SAFE_03], [], root);
    expect(d.eslintOnly).toEqual([SAFE_03]);
  });

  it('a host that lost the dedup state and reported per file is caught', () => {
    // One module instance per file or worker would report on every file.
    const d = diffFindings([SAFE_03], [SAFE_03, VULN_01], root);
    expect(d.oxlintOnly).toHaveLength(1);
  });

  it('findings in different projects are not merged', () => {
    const other = at('packages/other/src/index.js');
    const d = diffFindings([SAFE_03], [other], root);
    expect(d.eslintOnly).toEqual([SAFE_03]);
    expect(d.oxlintOnly).toEqual([other]);
  });

  it('line-scoped rules keep exact (file, line, column) matching', () => {
    const rule = 'node-security/detect-child-process';
    const d = diffFindings(
      [at(`${DIR}/safe/case-03.js`, rule, 9)],
      [at(`${DIR}/safe/case-03.js`, rule, 10)],
      root,
    );
    expect(d.eslintOnly).toHaveLength(1);
    expect(d.oxlintOnly).toHaveLength(1);
  });

  it('a project-scoped finding with no package.json above it falls back to its file', () => {
    // No project to key by: exact matching, never a silent merge.
    const orphan = mkdtempSync(join(tmpdir(), 'parity-orphan-'));
    try {
      const d = diffFindings([at('a.js')], [at('b.js')], orphan);
      expect(d.eslintOnly).toHaveLength(1);
      expect(d.oxlintOnly).toHaveLength(1);
    } finally {
      rmSync(orphan, { recursive: true, force: true });
    }
  });
});

describe('run.ts compares through finding-key.ts', () => {
  const runTs = readFileSync(
    resolve(REPO_ROOT, 'benchmarks/suites/ilb-oxlint-parity/run.ts'),
    'utf8',
  );

  it('imports diffFindings and keeps no inline per-file key', () => {
    expect(runTs).toMatch(
      /import \{ diffFindings \} from '\.\/finding-key\.ts'/,
    );
    expect(runTs).not.toMatch(/function key\(/);
    expect(runTs).toMatch(
      /return diffFindings\(eslintFindings, oxlintFindings, REPO_ROOT\);/,
    );
  });
});
