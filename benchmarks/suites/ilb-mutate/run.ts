#!/usr/bin/env -S npx tsx
/**
 * ILB-Mutate — fixture mutation testing (roadmap item 4.1).
 *
 * Stronger sibling of ILB-Evade. Where ILB-Evade applies superficial,
 * cosmetic mutations (rename / template / whitespace), ILB-Mutate applies
 * the same Stryker-class semantic mutations the academic literature uses
 * to measure test-suite robustness — but inverted: we mutate **vulnerable
 * fixtures**, and a robust rule should *still* fire.
 *
 * Mutators:
 *   1. **string-literal-swap**  — replace one literal with another that
 *                                preserves structure (`'admin'` → `'root'`).
 *   2. **conditional-boundary** — `<` ↔ `<=`, `>` ↔ `>=`, `!=` ↔ `!==`.
 *   3. **arithmetic-operator**  — `+` ↔ `-`, `*` ↔ `/` (where the rule
 *                                doesn't depend on the specific operator).
 *   4. **null-vs-undefined**    — `=== null` ↔ `=== undefined`.
 *   5. **statement-reorder**    — swap two adjacent independent statements.
 *   6. **block-wrap**           — wrap a single statement in a block.
 *   7. **comment-injection**    — insert a no-op comment between tokens.
 *   8. **paren-redundancy**     — wrap an expression in extra parens.
 *
 * Score: per-rule survival rate. SLO: ≥ 92% (slightly stricter than
 * ILB-Evade because semantic mutations should be even less defeating
 * than cosmetic ones).
 *
 * Why two benches: ILB-Evade tests "does my rule survive cosmetic LLM
 * rewrites?" ILB-Mutate tests "does my rule survive *semantic* mutations
 * that academic mutation-testing literature uses?" Different threat models;
 * both matter for principle #5 (multi-rater agreement) and the agent-axis
 * robustness claim.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-mutate/run.mjs
 *   tsx benchmarks/suites/ilb-mutate/run.mjs --cwe CWE-089 --mutators conditional-boundary,paren-redundancy
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const CORPUS_ROOT = path.join(REPO_ROOT, 'benchmarks', 'corpus');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-mutate');
const ESLINT_CONFIG = path.join(REPO_ROOT, 'eslint.benchmark.config.mjs');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const ONLY_CWE = ARG('--cwe');
const REQUESTED = (ARG('--mutators') ?? 'string-literal-swap,conditional-boundary,null-vs-undefined,comment-injection,paren-redundancy,block-wrap').split(',').map((s) => s.trim());

const SLO_SURVIVAL = 0.92;

const MUTATORS = {
  'string-literal-swap': (src) => {
    const swaps = [['admin', 'root'], ['password', 'pass'], ['secret', 'key'], ['token', 'tk'], ['user', 'usr']];
    for (const [from, to] of swaps) {
      const re = new RegExp(`(['"\`])(\\b${from}\\b[^'"\`]*)`, 'g');
      if (re.test(src)) return src.replace(re, (_, q, rest) => `${q}${rest.replace(from, to)}`);
    }
    return src;
  },
  'conditional-boundary': (src) => {
    const before = src;
    src = src.replace(/(?<![<=>!])<=(?!=)/g, '<').replace(/(?<![<=>!])>=(?!=)/g, '>');
    return src === before ? src : src;
  },
  'null-vs-undefined': (src) => src.replace(/===\s*null\b/g, '=== undefined').replace(/!==\s*null\b/g, '!== undefined'),
  'comment-injection': (src) => {
    // Insert a no-op comment after the first `=` or `(` we find on a non-trivial line
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 20 && /[=(]/.test(lines[i])) {
        lines[i] = lines[i].replace(/([=(])/, '$1 /* mut */ ');
        return lines.join('\n');
      }
    }
    return src;
  },
  'paren-redundancy': (src) => {
    // Wrap a string literal in extra parens
    const before = src;
    src = src.replace(/=\s*'([^']*)'/, "= ('$1')").replace(/=\s*"([^"]*)"/, '= ("$1")');
    return src === before ? src : src;
  },
  'block-wrap': (src) => {
    // Wrap an else single-line statement in braces
    return src.replace(/\belse\s+([a-zA-Z_$][^\n;]+;)/g, 'else { $1 }');
  },
  'arithmetic-operator': (src) => {
    // Swap a + b → a - b ONLY in non-string, non-template contexts. Conservative.
    const m = src.match(/([a-zA-Z_$][\w]*)\s*\+\s*1\b/);
    return m ? src.replace(m[0], `${m[1]} - 1 + 2`) : src; // preserves value
  },
  'statement-reorder': (src) => {
    // Swap two adjacent declarations if both are simple `const x = ...;`
    const re = /(const \w+ = [^;]+;)\n(\s*)(const \w+ = [^;]+;)/;
    return src.replace(re, '$3\n$2$1');
  },
};

function lintAsSibling(src, originalPath) {
  // Write the (mutated) source as a sibling of the original fixture so the
  // ESLint config's globs match. Original is preserved.
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const tmpName = `__ilb_mutate_${process.pid}_${Date.now()}${ext}`;
  const file = path.join(dir, tmpName);
  fs.writeFileSync(file, src, 'utf8');
  let raw = '';
  try {
    raw = execSync(`npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${file}"`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
  } finally {
    fs.rmSync(file, { force: true });
  }
  if (!raw) return new Set();
  const results = JSON.parse(raw);
  return new Set(results.flatMap((r) => (r.messages ?? []).filter((m) => m.ruleId).map((m) => m.ruleId)));
}

function listFixtures() {
  if (!fs.existsSync(CORPUS_ROOT)) return [];
  const out = [];
  for (const entry of fs.readdirSync(CORPUS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('CWE-')) continue;
    if (ONLY_CWE && entry.name !== ONLY_CWE) continue;
    const vulnDir = path.join(CORPUS_ROOT, entry.name, 'vulnerable');
    if (!fs.existsSync(vulnDir)) continue;
    for (const f of fs.readdirSync(vulnDir)) {
      if (!/\.(js|ts|tsx|mjs)$/.test(f)) continue;
      out.push({ cwe: entry.name, file: path.join(vulnDir, f), ext: path.extname(f) });
    }
  }
  return out;
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const fixtures = listFixtures();
  if (fixtures.length === 0) { console.error('no fixtures'); process.exit(1); }

  console.log(`ILB-Mutate v0.1 · ${fixtures.length} fixtures · mutators=${REQUESTED.join(',')}`);
  console.log('');

  const triples = [];
  let totalChecks = 0;
  let totalSurvived = 0;
  const perRule = {};
  const perMutator = {};

  for (const fx of fixtures) {
    const src = fs.readFileSync(fx.file, 'utf8');
    const baseline = lintAsSibling(src, fx.file);
    if (baseline.size === 0) { console.log(`  ⏭  ${path.relative(REPO_ROOT, fx.file)} — no baseline findings`); continue; }
    process.stdout.write(`  ${path.relative(REPO_ROOT, fx.file)} `);
    for (const m of REQUESTED) {
      const mutator = MUTATORS[m];
      if (!mutator) continue;
      const mutated = mutator(src);
      if (mutated === src) continue;
      const after = lintAsSibling(mutated, fx.file);
      let allSurvived = true;
      for (const rule of baseline) {
        const survived = after.has(rule);
        triples.push({ rule, fixture: path.relative(REPO_ROOT, fx.file), mutator: m, survived });
        totalChecks++;
        if (survived) totalSurvived++; else allSurvived = false;
        perRule[rule] = perRule[rule] ?? { total: 0, survived: 0 };
        perRule[rule].total++;
        if (survived) perRule[rule].survived++;
        perMutator[m] = perMutator[m] ?? { total: 0, survived: 0 };
        perMutator[m].total++;
        if (survived) perMutator[m].survived++;
      }
      process.stdout.write(allSurvived ? '✓' : '×');
    }
    console.log('');
  }

  const ruleSurvivalRate = totalChecks === 0 ? 1 : totalSurvived / totalChecks;
  const passed = ruleSurvivalRate >= SLO_SURVIVAL;

  console.log('');
  console.log(`Survival: ${totalSurvived}/${totalChecks} = ${(ruleSurvivalRate * 100).toFixed(1)}%  ${passed ? '✅' : '❌'} (SLO ≥ ${(SLO_SURVIVAL * 100)}%)`);
  console.log('');
  console.log('Per mutator:');
  for (const [m, d] of Object.entries(perMutator)) console.log(`  ${m.padEnd(22)} ${d.survived}/${d.total} = ${(d.survived / d.total * 100).toFixed(1)}%`);

  const date = new Date().toISOString().slice(0, 10);
  const envelope = {
    bench: 'ILB-Mutate',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: capturePreregistration({ allowDirty: true }).methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: { ruleSurvivalRate },
    latency: {},
    perRule,
    perMutator,
    totalChecks,
    totalSurvived,
    triples,
  };
  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  appendHistory(envelope, outPath);
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => { console.error('ILB-Mutate fatal:', err); process.exit(2); });
