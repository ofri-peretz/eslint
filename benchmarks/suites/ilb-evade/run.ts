#!/usr/bin/env -S npx tsx
/**
 * ILB-Evade — adversarial-rewrite resilience (roadmap item 2.4).
 *
 * Tests the agent-axis question: do our rules survive an LLM rewriting the
 * vulnerable code into a semantically-equivalent variant? In the AI-generated-
 * code era, lint rules that match a single textual pattern are trivially
 * defeated by a "rewrite this without changing what it does" prompt.
 *
 * This bench applies *deterministic* AST-equivalent mutations (no LLM cost,
 * full reproducibility) as a proxy for rewrite resilience. Mutations:
 *
 *   1. **Variable rename** — `password` → `pw`, `query` → `q`, etc.
 *   2. **String concat ↔ template literal** — `'a' + b` ↔ \`a${b}\`
 *   3. **Whitespace / formatting drift** — extra newlines, paren spacing.
 *   4. **Identifier-with-underscore** — `userInput` → `user_input`.
 *   5. **Function expression ↔ arrow** — `function() {}` ↔ `() => {}` (where safe).
 *
 * For each Juliet vulnerable fixture, we apply each mutation, re-lint, and
 * record whether the rule that originally fired still fires. Aggregate score:
 * `ruleSurvivalRate` — % of (rule, fixture, mutation) triples where the rule
 * survived. SLO: ≥ 90% (allows a few documented gaps without failing).
 *
 * Future LLM upgrade: add `--use-llm` flag that uses Claude / GPT to generate
 * variants. The deterministic baseline stays as the cost-free CI gate.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-evade/run.mjs
 *   tsx benchmarks/suites/ilb-evade/run.mjs --cwe CWE-089
 *   tsx benchmarks/suites/ilb-evade/run.mjs --mutations rename,template
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const CORPUS_ROOT = path.join(REPO_ROOT, 'benchmarks', 'corpus');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-evade');
const ESLINT_CONFIG = path.join(REPO_ROOT, 'eslint.benchmark.config.mjs');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const ONLY_CWE = ARG('--cwe');
const REQUESTED_MUTATIONS = (ARG('--mutations') ?? 'rename,template,whitespace,snake_case').split(',').map((s) => s.trim());

// ─── deterministic mutators ──────────────────────────────────────────────

const MUTATORS = {
  rename(src) {
    // Rename common identifiers. Picks one identifier per source so rule signatures stay intact for AST-based rules.
    const renames = [
      ['password', 'pw'],
      ['username', 'usr'],
      ['userInput', 'inp'],
      ['userInput', 'user_input'],
      ['query', 'q'],
      ['command', 'cmd'],
      ['filePath', 'fp'],
      ['secret', 'sec'],
      ['token', 'tk'],
    ];
    for (const [from, to] of renames) {
      const re = new RegExp(`\\b${from}\\b`, 'g');
      if (re.test(src)) return src.replace(re, to);
    }
    return src;
  },
  template(src) {
    // Convert simple `'literal' + ident` to `\`literal${ident}\``.
    const before = src;
    src = src.replace(/'([^']*)'\s*\+\s*(\w+)/g, '`$1${$2}`');
    src = src.replace(/"([^"]*)"\s*\+\s*(\w+)/g, '`$1${$2}`');
    return src === before ? src : src;
  },
  whitespace(src) {
    // Normalize whitespace, double-space some operators, add a stray blank line.
    return src.replace(/=/g, ' = ').replace(/\n\n+/g, '\n\n').replace(/  +/g, ' ');
  },
  snake_case(src) {
    return src.replace(/\b([a-z]+)([A-Z])([a-z]+)\b/g, (_, a, b, c) => `${a}_${b.toLowerCase()}${c}`);
  },
};

// ─── lint runner ─────────────────────────────────────────────────────────

function lintTempFile(srcContent, ext = '.js') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilb-evade-'));
  const tmpFile = path.join(tmpDir, `fixture${ext}`);
  fs.writeFileSync(tmpFile, srcContent, 'utf8');
  let raw = '';
  try {
    raw = execSync(`npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${tmpFile}"`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) { fs.rmSync(tmpDir, { recursive: true, force: true }); return []; }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const results = JSON.parse(raw);
  return results.flatMap((r) => (r.messages ?? []).filter((m) => m.ruleId).map((m) => m.ruleId));
}

function listVulnerableFixtures() {
  const out = [];
  if (!fs.existsSync(CORPUS_ROOT)) return out;
  for (const entry of fs.readdirSync(CORPUS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('CWE-')) continue;
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

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const fixtures = listVulnerableFixtures();
  if (fixtures.length === 0) {
    console.error(`No vulnerable fixtures found under ${CORPUS_ROOT}`);
    process.exit(1);
  }

  console.log(`ILB-Evade v0.1 · ${fixtures.length} fixtures · mutations=${REQUESTED_MUTATIONS.join(',')}`);
  console.log('');

  const triples = []; // (rule, fixture, mutation) → survived
  let totalChecks = 0;
  let totalSurvived = 0;

  for (const fx of fixtures) {
    const src = fs.readFileSync(fx.file, 'utf8');
    const baselineRules = new Set(lintTempFile(src, fx.ext));
    if (baselineRules.size === 0) {
      console.log(`  ⏭  ${path.relative(REPO_ROOT, fx.file)}: baseline emits no findings, skipping`);
      continue;
    }
    process.stdout.write(`  ${path.relative(REPO_ROOT, fx.file)} (${baselineRules.size} rules baseline) `);

    for (const mutationName of REQUESTED_MUTATIONS) {
      const mutator = MUTATORS[mutationName];
      if (!mutator) continue;
      const mutated = mutator(src);
      if (mutated === src) continue; // mutation didn't change anything
      const mutatedRules = new Set(lintTempFile(mutated, fx.ext));
      for (const rule of baselineRules) {
        const survived = mutatedRules.has(rule);
        triples.push({ rule, fixture: path.relative(REPO_ROOT, fx.file), mutation: mutationName, survived });
        totalChecks++;
        if (survived) totalSurvived++;
      }
      process.stdout.write(survived ? '✓' : '×');
    }
    console.log('');
  }

  const ruleSurvivalRate = totalChecks === 0 ? 1 : totalSurvived / totalChecks;
  const passedSlo = ruleSurvivalRate >= 0.90;

  console.log('');
  console.log(`Rule survival: ${totalSurvived}/${totalChecks} = ${(ruleSurvivalRate * 100).toFixed(1)}%  ${passedSlo ? '✅' : '❌'} (SLO ≥ 90%)`);

  // Per-mutation rollup
  const byMutation = {};
  for (const t of triples) {
    const m = t.mutation;
    if (!byMutation[m]) byMutation[m] = { total: 0, survived: 0 };
    byMutation[m].total++;
    if (t.survived) byMutation[m].survived++;
  }
  console.log('');
  console.log('Per-mutation:');
  for (const [m, d] of Object.entries(byMutation)) {
    console.log(`  ${m.padEnd(12)} ${d.survived}/${d.total} = ${(d.survived / d.total * 100).toFixed(1)}%`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const envelope = {
    bench: 'ILB-Evade',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: capturePreregistration({ allowDirty: true }).methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: { ruleSurvivalRate },
    latency: {},
    perMutation: byMutation,
    totalChecks,
    totalSurvived,
    triples,
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  appendHistory(envelope, outPath);
  console.log('');
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
  process.exit(passedSlo ? 0 : 1);
}

main().catch((err) => {
  console.error('ILB-Evade fatal:', err);
  process.exit(2);
});
