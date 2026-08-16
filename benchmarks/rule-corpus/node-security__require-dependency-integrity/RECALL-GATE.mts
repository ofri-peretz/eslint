/**
 * Recall gate for the four rules changed in this session.
 *
 * Precision work in this repository has bought recall loss before, so every
 * fix is re-measured against the CALIBRATED corpus (`benchmarks/corpus/`) in
 * the same session. This lints every corpus file with each rule as it is on
 * disk now AND as it is at HEAD, and prints the delta.
 *
 * A negative delta on a rule where only false positives were fixed is expected
 * and must be inspected file by file; a negative delta anywhere else is a
 * regression. Run with `npx tsx` from the repository root.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const REPO = process.cwd();
/**
 * `lock-file` is deliberately absent: its verdict is filesystem state, not file
 * content (see `node-security__lock-file/MANIFEST.md`), so a per-file delta
 * over the corpus would be meaningless. It also cannot be loaded here — its
 * `create()` calls `require('node:fs')`, which is undefined when tsx resolves a
 * file under `benchmarks/` as ESM. Harmless in the published CommonJS build,
 * but worth knowing before anyone tries to lint with the TypeScript source.
 */
const RULES = [
  'detect-suspicious-dependencies',
  'require-dependency-integrity',
  'no-dynamic-dependency-loading',
];

const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.[jt]sx?$/.test(entry.name)) files.push(full);
  }
};
walk(path.join(REPO, 'benchmarks', 'corpus'));

const linter = new Linter();

async function countFor(rulePath: string, ruleName: string): Promise<number> {
  const mod = await import(`${url.pathToFileURL(rulePath).href}?t=${Date.now()}`);
  const rule = Object.values(mod).find((v) => v && typeof v === 'object' && 'create' in (v as object));
  let total = 0;
  for (const file of files) {
    const messages = linter.verify(
      fs.readFileSync(file, 'utf8'),
      {
        languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { ours: { rules: { [ruleName]: rule as never } } },
        rules: { [`ours/${ruleName}`]: 'error' },
      },
      path.basename(file),
    );
    total += messages.filter((m) => m.ruleId).length;
  }
  return total;
}

/**
 * The HEAD snapshots must live INSIDE the repository: they resolve
 * `@interlace/eslint-devkit` through node_modules, which a system temp dir
 * cannot see. Relative `../../utils/` imports are rewritten to absolute paths
 * for the same reason. This directory is not `vulnerable/` or `safe/`, so the
 * duel harness never reads it.
 */
const head = path.join(REPO, 'benchmarks', 'rule-corpus', 'node-security__require-dependency-integrity', '.head-snapshot');
fs.rmSync(head, { recursive: true, force: true });
fs.mkdirSync(head, { recursive: true });
const UTILS = path.join(REPO, 'packages', 'eslint-plugin-node-security', 'src', 'utils');

console.log(`corpus files: ${files.length}\n`);
console.log('| rule | HEAD | working tree | delta |');
console.log('|---|---:|---:|---:|');

for (const name of RULES) {
  const relative = `packages/eslint-plugin-node-security/src/rules/${name}/index.ts`;
  const headCopy = path.join(head, `${name}.ts`);
  const source = execFileSync('git', ['show', `HEAD:${relative}`], { cwd: REPO, encoding: 'utf8' });
  fs.writeFileSync(headCopy, source.replaceAll("'../../utils/", `'${UTILS}/`));
  const before = await countFor(headCopy, name);
  const after = await countFor(path.join(REPO, relative), name);
  console.log(`| ${name} | ${before} | ${after} | ${after - before >= 0 ? '+' : ''}${after - before} |`);
}

// Leave no artefacts behind: the snapshots are regenerated on every run.
fs.rmSync(head, { recursive: true, force: true });
