#!/usr/bin/env -S npx tsx
/**
 * ILB-Determinism — same input × N runs × M plugin versions (roadmap item 1.6).
 *
 * Operationalizes the agent-axis principle that **same input must produce
 * same output**. Non-determinism is a silent killer for agents looping on
 * lint findings — they get into infinite-fix cycles when the same code
 * triggers slightly different output across runs.
 *
 * What it does:
 *   1. Pick a fixed corpus (default: `benchmarks/corpus/CWE-089/vulnerable/*`).
 *   2. Run ESLint with the recommended config N times (default 5).
 *   3. Hash each run's normalized output (ruleId, message, line, column, severity).
 *   4. Pass if **every run produces an identical hash**. Fail if any deviate.
 *   5. Optionally run across plugin versions (`--versions a,b,c`) to check
 *      that bumping a patch version doesn't change findings.
 *
 * Output: result envelope at `benchmarks/results/ilb-determinism/<date>.json`.
 *
 * Score (effectiveness aspect): `ruleSurvivalRate` 0..1 — fraction of
 * findings that appear identically across all runs. SLO: 1.0 (zero drift).
 *
 * Usage:
 *   node benchmarks/suites/ilb-determinism/run.mjs
 *   node benchmarks/suites/ilb-determinism/run.mjs --runs 10
 *   node benchmarks/suites/ilb-determinism/run.mjs --corpus path/to/dir
 *   node benchmarks/suites/ilb-determinism/run.mjs --plugin secure-coding
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const CORPUS_DEFAULT = path.join(REPO_ROOT, 'benchmarks', 'corpus');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-determinism');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const RUNS = Number.parseInt(ARG('--runs', '5'), 10);
const CORPUS = path.resolve(ARG('--corpus', CORPUS_DEFAULT));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));

function lintOnce(corpus, configPath) {
  // tsx-load the config so TypeScript-source plugins resolve (the bench
  // imports plugins from `packages/*/src/index.ts` directly).
  const cmd = `npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${configPath}" "${corpus}"`;
  let raw = '';
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    // ESLint exits non-zero on lint errors — that's fine for our purposes
    raw = err.stdout?.toString() ?? '';
    if (!raw) throw err;
  }
  return JSON.parse(raw);
}

/**
 * Normalize a per-file lint result into a finding tuple comparable across runs.
 * Strips fields that legitimately drift between runs (timing, randomized IDs)
 * but preserves everything that should be deterministic.
 */
function normalizeResults(eslintResults) {
  const out = [];
  for (const r of eslintResults) {
    const rel = path.relative(REPO_ROOT, r.filePath).split(path.sep).join('/');
    for (const m of r.messages ?? []) {
      out.push([
        rel,
        m.ruleId ?? '<parse-error>',
        m.severity,
        m.line ?? 0,
        m.column ?? 0,
        m.endLine ?? 0,
        m.endColumn ?? 0,
        m.message,
      ]);
    }
  }
  out.sort();
  return out;
}

function hashFindings(findings) {
  return crypto.createHash('sha256').update(JSON.stringify(findings)).digest('hex');
}

function diffSummary(a, b) {
  const aSet = new Set(a.map((row) => JSON.stringify(row)));
  const bSet = new Set(b.map((row) => JSON.stringify(row)));
  const onlyA = [...aSet].filter((row) => !bSet.has(row)).length;
  const onlyB = [...bSet].filter((row) => !aSet.has(row)).length;
  return { onlyA, onlyB, total: aSet.size + bSet.size, shared: aSet.size - onlyA };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`ILB-Determinism v1.0 · ${RUNS} runs · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true }); // local runs may be dirty; CI sets allowDirty:false elsewhere
  const toolchain = getToolchain();

  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`  run ${i + 1}/${RUNS}... `);
    const t0 = process.hrtime.bigint();
    const raw = lintOnce(CORPUS, ESLINT_CONFIG);
    const t1 = process.hrtime.bigint();
    const findings = normalizeResults(raw);
    const hash = hashFindings(findings);
    runs.push({ index: i, hash, findings, durationMs: Number(t1 - t0) / 1e6 });
    console.log(`hash=${hash.slice(0, 12)} (${runs[i].durationMs.toFixed(0)}ms, ${findings.length} findings)`);
  }

  const baseline = runs[0];
  const drifted = runs.filter((r) => r.hash !== baseline.hash);
  const surviving = drifted.length === 0
    ? baseline.findings.length
    : (() => {
        // Findings present in *every* run
        const sets = runs.map((r) => new Set(r.findings.map((row) => JSON.stringify(row))));
        return [...sets[0]].filter((row) => sets.every((s) => s.has(row))).length;
      })();

  const ruleSurvivalRate = baseline.findings.length === 0 ? 1 : surviving / baseline.findings.length;
  const passed = drifted.length === 0;

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Determinism',
    benchVersion: '1.0',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain,
    preregistration: prereg,
    cost: {},
    effectiveness: {
      ruleSurvivalRate,
    },
    latency: {
      meanLatencyMs: runs.reduce((s, r) => s + r.durationMs, 0) / runs.length,
    },
    runs: runs.map((r) => ({ index: r.index, hash: r.hash, findingCount: r.findings.length, durationMs: r.durationMs })),
    drift: drifted.length > 0 ? drifted.map((r) => ({ run: r.index, hash: r.hash, vsBaseline: diffSummary(baseline.findings, r.findings) })) : [],
    passed,
    corpus: path.relative(REPO_ROOT, CORPUS),
    runsCount: RUNS,
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  if (passed) {
    console.log(`✅ ILB-Determinism PASS — all ${RUNS} runs identical (hash=${baseline.hash.slice(0, 12)}, ${baseline.findings.length} findings)`);
  } else {
    console.log(`❌ ILB-Determinism FAIL — ${drifted.length} of ${RUNS} runs deviated from baseline`);
    for (const d of result.drift) {
      console.log(`     run ${d.run}: hash=${d.hash.slice(0, 12)} (Δ +${d.vsBaseline.onlyB} −${d.vsBaseline.onlyA})`);
    }
    console.log(`   ruleSurvivalRate=${ruleSurvivalRate.toFixed(4)} (SLO: 1.0)`);
  }
  console.log(`   wrote ${path.relative(REPO_ROOT, outPath)}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('ILB-Determinism fatal:', err);
  process.exit(2);
});
