#!/usr/bin/env node
/**
 * Self-contained reproduction: deep import chains crash `eslint-plugin-import`.
 *
 * Builds a chain of N modules where each imports the previous one, then runs
 * `no-cycle` from both plugins over it and reports what happened. Nothing from
 * this monorepo is required — copy this file anywhere with the three packages
 * installed and it runs:
 *
 *   npm i -D eslint eslint-plugin-import eslint-plugin-import-next
 *   node repro-deep-chain.mjs          # default depth 6000
 *   node repro-deep-chain.mjs 8000     # or pick your own
 *
 * Why it happens: cycle detection is a strongly-connected-components pass over
 * the module graph. Implemented recursively — one JS stack frame per module —
 * a chain deeper than the engine's call stack throws
 * `RangeError: Maximum call stack size exceeded`, and ESLint exits 2 with no
 * results at all. Not a slow lint: no lint. `import-next` runs the same
 * traversal on an explicit stack, so its depth limit is heap, not stack.
 *
 * Note both rules default to unlimited traversal depth, so nothing caps the
 * descent. Chains this deep are rare by hand and ordinary in generated code,
 * barrel-heavy monorepos, and long re-export ladders.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEPTH = Number(process.argv[2] ?? 6000);

// Built under the current directory, not the OS temp dir: an ESLint flat config
// resolves `eslint-plugin-*` relative to its own location, so a config in /tmp
// cannot see the node_modules you installed into your project. Run this from
// the project root where the three packages are installed.
const dir = path.join(process.cwd(), '.deep-chain-repro');
fs.rmSync(dir, { recursive: true, force: true });
const src = path.join(dir, 'src');
fs.mkdirSync(src, { recursive: true });

// file0 is the tail; file{i} imports file{i-1}. Strictly descending, so the
// graph is acyclic — every module lands in its own singleton component. The
// point is the depth of the walk, not finding a cycle.
fs.writeFileSync(path.join(src, 'file0.js'), 'export const v0 = 1;\n');
for (let i = 1; i < DEPTH; i++) {
  fs.writeFileSync(
    path.join(src, `file${i}.js`),
    `import { v${i - 1} } from './file${i - 1}.js';\nexport const v${i} = 1;\n`
  );
}

const configs = {
  'eslint-plugin-import': `
import importPlugin from 'eslint-plugin-import';
export default [{
  plugins: { import: importPlugin },
  rules: { 'import/no-cycle': 'error' },
  settings: { 'import/resolver': { node: true } },
}];`,
  'eslint-plugin-import-next': `
import importNext from 'eslint-plugin-import-next';
export default [{
  plugins: { 'import-next': importNext },
  rules: { 'import-next/no-cycle': 'error' },
}];`,
};

console.log(`\nchain depth: ${DEPTH} modules\nfixture:     ${dir}\n`);

for (const [name, config] of Object.entries(configs)) {
  const configPath = path.join(dir, `${name}.config.mjs`);
  fs.writeFileSync(configPath, config);

  const started = process.hrtime.bigint();
  let status = 0;
  let stderr = '';
  try {
    execFileSync(
      'npx',
      ['eslint', src, '--config', configPath, '--no-error-on-unmatched-pattern'],
      // Discard stdout: buffering thousands of report lines would overrun
      // execFileSync's 1 MB default and kill the child, which looks exactly
      // like a timeout. Only the exit status matters here.
      { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' }
    );
  } catch (e) {
    status = e.status ?? -1;
    stderr = (e.stderr?.toString() ?? '').trim();
  }
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;

  // 0 = clean, 1 = lint errors reported (the rule ran), 2 = the rule threw.
  if (status === 2) {
    const line =
      stderr.split('\n').find((l) => /RangeError|Cannot find|Error:/.test(l)) ??
      stderr.split('\n').slice(-1)[0] ??
      'exit 2 (no stderr)';
    console.log(`${name.padEnd(28)} FAILED after ${seconds.toFixed(1)}s — ${line.trim()}`);
  } else {
    console.log(`${name.padEnd(28)} completed in ${seconds.toFixed(1)}s`);
  }
}

fs.rmSync(dir, { recursive: true, force: true });
console.log();
