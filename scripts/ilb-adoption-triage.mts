#!/usr/bin/env -S npx tsx

/**
 * ILB Adoption Triage — turn a scan of a candidate repo into two work queues.
 *
 * The adoption loop:
 *
 *   1. find candidate repos        ADOPTION-TARGET-NETWORK.md (131 qualified)
 *   2. scan at HEAD                this script
 *   3. TRUE POSITIVE  -> open a PR to that repo   (a fix + the rule + the install)
 *   4. FALSE POSITIVE -> fix the rule, PUBLISH, re-scan to confirm
 *
 * Step 4 is not optional and does not end at "fixed". Every false positive found so
 * far came from the npm tarball, not from `main` — a stranger runs what is published,
 * so an unreleased fix has changed nothing for them.
 *
 * What this script can and cannot do: it cannot decide TP vs FP — that requires
 * reading the code, and every finding in a PR must be read by a human first. What it
 * does is rank findings so the reading is cheap, using two signals learned the hard way:
 *
 *   • Volume is the strongest FP signal. A rule reporting 100+ times on one repo is
 *     describing a coding style, not a vulnerability. The three noisiest rules in
 *     `strict` produced 75% of all findings and every sampled one was a false positive.
 *   • Known-FP rules are suppressed outright, from benchmarks/fp-gate/baseline.json.
 *     Re-triaging a rule already proven wrong wastes the reviewer twice.
 *
 * Usage:
 *   tsx scripts/ilb-adoption-triage.ts --preset=recommended <repo-dir> [...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// createRequire, not `await import`: these plugins are CommonJS, and ESM interop
// hands back a namespace whose `configs` is not the module's. That silently yielded
// 7 rules instead of 201 — and a scan wired to 7 rules reports "0 findings".
const require = createRequire(import.meta.url);
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(ROOT, 'benchmarks', 'fp-gate', 'baseline.json');

const arg = (n: string, d: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const PRESET = arg('preset', 'recommended');
/** Above this many hits in one repo, a rule is describing a style, not a bug. */
const NOISE_FLOOR = Number(arg('noise-floor', '10'));
const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const knownFp = new Set<string>(
  (fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, 'utf8')).knownFalsePositives as string[])
    : []
  ).map((k) => k.split(':')[1]),
);

const plugins: Record<string, any> = {};
const rules: Record<string, unknown> = {};

function loadPresetRules() {
for (const dir of fs
  .readdirSync(path.join(ROOT, 'packages'))
  .filter((d) => d.startsWith('eslint-plugin-'))
  .filter((d) => d.endsWith('-security') || d === 'eslint-plugin-secure-coding')) {
  const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const entry = path.join(ROOT, 'packages', dir, pkg.main ?? 'dist/src/index.js');
  if (!fs.existsSync(entry)) continue;
  const plugin = require(entry);
  const cfg = plugin.configs?.[PRESET];
  if (!cfg) continue;
  plugins[pkg.name.replace(/^eslint-plugin-/, '')] = plugin;
  Object.assign(
    rules,
    cfg.rules ?? (Array.isArray(cfg) ? Object.assign({}, ...cfg.map((c: any) => c.rules ?? {})) : {}),
  );
}
}

async function main() {
loadPresetRules();
const enabled = new Set(Object.keys(rules));

// Never report "0 findings" without proving the rules loaded. A scan wired to an
// empty rule set is indistinguishable from a clean repo, and reads as good news.
if (enabled.size === 0) {
  console.error(
    `\nABORT: preset "${PRESET}" resolved to 0 rules across ${Object.keys(plugins).length} plugins.\n` +
      `Build the workspace first: npx turbo build --filter="./packages/eslint-plugin-*"\n`,
  );
  process.exitCode = 1;
  return;
}
console.error(`[${Object.keys(plugins).length} plugins, ${enabled.size} rules on preset "${PRESET}"]`);

const walk = (d: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (/node_modules|\.git|dist|build|coverage|fixtures|__snapshots__/.test(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/.test(e.name) && !/\.min\./.test(e.name)) out.push(p);
  }
  return out;
};

type Hit = { file: string; line: number; rule: string; text: string };

for (const target of targets) {
  const linter = new Linter();
  const hits: Hit[] = [];
  let loc = 0;
  for (const f of walk(target)) {
    const code = fs.readFileSync(f, 'utf8');
    if (code.length > 400_000) continue;
    loc += code.split('\n').length;
    let msgs;
    try {
      msgs = linter.verify(code, {
        plugins,
        rules: rules as any,
        languageOptions: {
          parser: tsParser as any,
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
      });
    } catch {
      continue;
    }
    const lines = code.split('\n');
    for (const m of msgs) {
      if (!m.ruleId || !enabled.has(m.ruleId)) continue;
      hits.push({
        file: path.relative(target, f),
        line: m.line,
        rule: m.ruleId,
        text: lines[m.line - 1]?.trim().slice(0, 100) ?? '',
      });
    }
  }

  const byRule = new Map<string, Hit[]>();
  for (const h of hits) byRule.set(h.rule, [...(byRule.get(h.rule) ?? []), h]);

  const suppressed = [...byRule].filter(([r]) => knownFp.has(r));
  const noisy = [...byRule].filter(([r, hs]) => !knownFp.has(r) && hs.length > NOISE_FLOOR);
  const triage = [...byRule]
    .filter(([r, hs]) => !knownFp.has(r) && hs.length <= NOISE_FLOOR)
    .sort((a, b) => a[1].length - b[1].length);

  console.log(`\n${'='.repeat(72)}\n${path.basename(target)}  —  ${(loc / 1000).toFixed(1)} KLOC, preset "${PRESET}", ${hits.length} findings`);

  if (suppressed.length)
    console.log(`\n  suppressed (already proven FP, in fp-gate baseline):\n` +
      suppressed.map(([r, hs]) => `    ${String(hs.length).padStart(4)}  ${r}`).join('\n'));

  if (noisy.length)
    console.log(`\n  FP CANDIDATES (over ${NOISE_FLOOR} hits — a rule this loud is describing a style):\n` +
      noisy.map(([r, hs]) => `    ${String(hs.length).padStart(4)}  ${r}`).join('\n'));

  console.log(`\n  TP CANDIDATES — read every one before it goes in a PR (${triage.length} rules):`);
  if (!triage.length) console.log('    none');
  for (const [rule, hs] of triage) {
    console.log(`\n    ${rule}  (${hs.length})`);
    for (const h of hs.slice(0, 4)) console.log(`      ${h.file}:${h.line}\n        ${h.text}`);
  }
}
}

void main();
