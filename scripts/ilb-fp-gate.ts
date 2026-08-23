#!/usr/bin/env -S npx tsx

/**
 * ILB FP-Gate — the benign corpus that must stay silent.
 *
 * Every file under `benchmarks/fp-gate/corpus/` is code we have READ and confirmed
 * is not a vulnerability, most of it lifted verbatim from real open-source repos.
 * Any finding on this corpus is, by construction, a false positive.
 *
 * Why this exists: a rule's own test fixtures only ever contain code that already
 * looks like its target domain — every `eslint-plugin-jwt-security` fixture names
 * the receiver `jwt`, so nothing in the suite can catch the rule firing on
 * `this.verify(changes, [], facts)` in a repo with no JWT. This corpus is the
 * opposite population: plausible code the rules should ignore.
 *
 * Ratchet, not a cliff. `baseline.json` records the FPs known today. CI fails when
 * the count GROWS or a new construct starts firing; every fix shrinks the baseline.
 * When it reaches zero the gate flips to zero-tolerance (see --strict).
 *
 * Usage:
 *   tsx scripts/ilb-fp-gate.ts              # report + ratchet check (CI)
 *   tsx scripts/ilb-fp-gate.ts --update     # re-baseline after a fix lands
 *   tsx scripts/ilb-fp-gate.ts --strict     # zero findings allowed, no baseline
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GATE_DIR = path.join(ROOT, 'benchmarks', 'fp-gate');
const CORPUS_DIR = path.join(GATE_DIR, 'corpus');
const BASELINE = path.join(GATE_DIR, 'baseline.json');

const UPDATE = process.argv.includes('--update');
const STRICT = process.argv.includes('--strict');

type Finding = { file: string; line: number; ruleId: string };

async function loadPlugins() {
  // Security plugins only. A style rule reporting on this corpus ("prefer node:",
  // "no commonjs") is correct behaviour, not a false positive — the contract here is
  // about SECURITY claims, which are the ones that cost credibility when wrong.
  const dirs = fs
    .readdirSync(path.join(ROOT, 'packages'))
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter(
      (d) => d.endsWith('-security') || d === 'eslint-plugin-secure-coding',
    );

  const plugins: Record<string, { rules?: Record<string, unknown> }> = {};
  const failed: string[] = [];
  for (const dir of dirs) {
    const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkgName = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name as string;

    // Resolve by explicit path into THIS tree's packages, never by bare package
    // name: in a git worktree `node_modules` is typically symlinked to the primary
    // checkout, so a bare import resolves to the OTHER tree's packages and the gate
    // silently measures code you are not editing.
    //
    // Load the built entry (`main`), not `src/index.ts`, so the plugin and the devkit
    // it was compiled against always agree.
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name: string;
      main?: string;
    };
    const entry = path.join(
      ROOT,
      'packages',
      dir,
      pkgJson.main ?? 'dist/src/index.js',
    );
    try {
      if (!fs.existsSync(entry))
        throw new Error(`not built: ${path.relative(ROOT, entry)}`);
      const mod = await import(entry);
      const plugin = mod.default ?? mod;
      if (plugin?.rules)
        plugins[pkgName.replace(/^eslint-plugin-/, '')] = plugin;
    } catch (err) {
      failed.push(pkgName);
      console.warn(
        `  ! skipped ${pkgName}: ${(err as Error).message.split('\n')[0]}`,
      );
    }
  }
  return { plugins, failed, inScope: dirs.length };
}

async function main() {
  const { plugins, failed, inScope } = await loadPlugins();
  const pluginCount = Object.keys(plugins).length;

  // A gate that silently covers a third of the fleet reports "0 new false positives"
  // for the same reason an empty directory does. Refuse to produce a number we cannot
  // stand behind — partial coverage must be opted into explicitly.
  if (failed.length && !process.argv.includes('--allow-partial')) {
    console.error(
      `\nILB FP-Gate — ABORTING: ${failed.length}/${inScope} security plugins failed to load.\n` +
        `A partial run understates the false-positive count and would let a regression\n` +
        `land unnoticed. Build/install the workspace first (npm install && npx turbo build),\n` +
        `or pass --allow-partial to accept reduced coverage deliberately.\n\n` +
        failed.map((f) => `    ${f}`).join('\n') +
        '\n',
    );
    process.exitCode = 1;
    return;
  }
  const coverage = `${pluginCount}/${inScope} security plugins`;
  const ruleCount = Object.values(plugins).reduce(
    (n, p) => n + Object.keys(p.rules ?? {}).length,
    0,
  );

  const rules: Record<string, 'error'> = {};
  for (const [name, plugin] of Object.entries(plugins)) {
    for (const rule of Object.keys(plugin.rules ?? {}))
      rules[`${name}/${rule}`] = 'error';
  }

  const linter = new Linter();
  const findings: Finding[] = [];

  for (const file of fs.readdirSync(CORPUS_DIR).sort()) {
    const abs = path.join(CORPUS_DIR, file);
    const code = fs.readFileSync(abs, 'utf8');
    const messages = linter.verify(code, {
      // @ts-expect-error -- plugin shapes are validated at load
      plugins,
      rules,
      // The TypeScript parser, because that is what these rules actually run under
      // in the wild — several of the confirmed false positives do not reproduce
      // under espree at all, so espree would silently under-report.
      languageOptions: {
        // @ts-expect-error -- Linter accepts a parser object here
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'commonjs',
      },
    });
    for (const m of messages) {
      if (m.ruleId) findings.push({ file, line: m.line, ruleId: m.ruleId });
    }
  }

  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.ruleId.localeCompare(b.ruleId),
  );

  console.log(
    `\nILB FP-Gate — ${coverage}, ${ruleCount} rules, ` +
      `${fs.readdirSync(CORPUS_DIR).length} benign files` +
      `${failed.length ? `  [PARTIAL: ${failed.length} not loaded]` : ''}\n`,
  );

  if (findings.length === 0) {
    console.log('  No findings. The corpus is silent.\n');
  } else {
    for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.ruleId}`);
    console.log(`\n  ${findings.length} false positives.\n`);
  }

  const key = (f: Finding) => `${f.file}:${f.ruleId}`;
  const current = [...new Set(findings.map(key))].sort();

  if (UPDATE) {
    fs.writeFileSync(
      BASELINE,
      JSON.stringify({ knownFalsePositives: current }, null, 2) + '\n',
    );
    console.log(
      `  Baseline updated: ${current.length} known false positives.\n`,
    );
    return;
  }

  if (STRICT) {
    process.exitCode = findings.length === 0 ? 0 : 1;
    return;
  }

  const baseline: string[] = fs.existsSync(BASELINE)
    ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).knownFalsePositives
    : [];

  const added = current.filter((c) => !baseline.includes(c));
  const fixed = baseline.filter((b) => !current.includes(b));

  if (fixed.length) {
    console.log(`  ${fixed.length} fixed since baseline:`);
    for (const f of fixed) console.log(`    - ${f}`);
    console.log('  Run with --update to lock the improvement in.\n');
  }

  if (added.length) {
    console.error(`  REGRESSION — ${added.length} new false positive(s):`);
    for (const a of added) console.error(`    + ${a}`);
    console.error(
      '\n  A rule started reporting on code we confirmed is benign.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`  Ratchet OK — ${current.length} known, 0 new.\n`);
}

void main();
