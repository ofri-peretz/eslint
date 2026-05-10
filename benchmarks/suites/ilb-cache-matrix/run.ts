#!/usr/bin/env -S npx tsx
/**
 * ILB-Cache-Matrix — cold vs warm cache bench (roadmap item 1.21).
 *
 * ESLint's `--cache` flag stores per-file lint results and skips re-linting
 * unchanged files. For agents and CI pipelines, the cached path is the
 * common case (PR diffs are tiny), so the published latency number must
 * reflect both regimes:
 *
 *   - **cold** — cache cleared (or never populated). First-run cost. The
 *     number a *new contributor* sees on first `npm run lint`.
 *   - **warm** — cache populated, no source changes. Should be ~10-50× faster.
 *     The number a *daily developer* and CI's PR-only path see.
 *
 * Score: per-mode `latency.meanLatencyMs` + the `cacheSpeedup` ratio
 * (cold/warm). Findings drift across modes should be ZERO — cached results
 * must equal fresh results, no exceptions. Drift here is a cache-correctness
 * bug.
 *
 * SLOs:
 *   - cold ≤ 15 ms/file (consistent with ILB-Perf)
 *   - warm ≤ 1 ms/file (cache hit should be effectively free)
 *   - cacheSpeedup ≥ 10× (anything less suggests cache is broken)
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-cache-matrix/run.mjs
 *   tsx benchmarks/suites/ilb-cache-matrix/run.mjs --runs 5 --corpus benchmarks/corpus/CWE-089
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
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-cache-matrix');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const RUNS = Number.parseInt(ARG('--runs', '3'), 10);
const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));

function lintWithCache(cacheLocation, cacheClear) {
  if (cacheClear && fs.existsSync(cacheLocation)) fs.rmSync(cacheLocation, { force: true });
  const cmd = `npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --cache --cache-location "${cacheLocation}" --format json --config "${ESLINT_CONFIG}" "${CORPUS}"`;
  const t0 = process.hrtime.bigint();
  let raw = '';
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) throw err;
  }
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;
  const results = JSON.parse(raw);
  const findings = results.flatMap((r) => (r.messages ?? []).filter((m) => m.ruleId).map((m) => ({
    file: path.relative(REPO_ROOT, r.filePath), ruleId: m.ruleId, line: m.line ?? 0,
  })));
  const fileCount = results.length;
  return { durationMs, findings, fileCount };
}

function median(xs) {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function diffFindings(a, b) {
  const ka = new Set((a ?? []).map((f) => `${f.file}:${f.line}:${f.ruleId}`));
  const kb = new Set((b ?? []).map((f) => `${f.file}:${f.line}:${f.ruleId}`));
  return {
    onlyInA: [...ka].filter((k) => !kb.has(k)),
    onlyInB: [...kb].filter((k) => !ka.has(k)),
    shared: [...ka].filter((k) => kb.has(k)).length,
  };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const cacheTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ilb-cache-'));
  const cacheLocation = path.join(cacheTmp, '.eslintcache');

  console.log(`ILB-Cache-Matrix v0.1 · ${RUNS} runs/mode · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });

  // Cold: clear cache before each run
  console.log('── cold cache (cleared before each run) ──');
  const coldRuns = [];
  let coldFindings = null;
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`  run ${i + 1}/${RUNS}... `);
    const r = lintWithCache(cacheLocation, true);
    coldRuns.push(r);
    if (coldFindings === null) coldFindings = r.findings;
    console.log(`${r.durationMs.toFixed(0)}ms · ${r.findings.length} findings · ${r.fileCount} files`);
  }

  // Warm: cache populated by the last cold run; subsequent runs hit cache
  console.log('── warm cache (populated, no source changes) ──');
  const warmRuns = [];
  let warmFindings = null;
  // Run once first to ensure cache is populated, but discard the timing
  lintWithCache(cacheLocation, false);
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`  run ${i + 1}/${RUNS}... `);
    const r = lintWithCache(cacheLocation, false);
    warmRuns.push(r);
    if (warmFindings === null) warmFindings = r.findings;
    console.log(`${r.durationMs.toFixed(0)}ms · ${r.findings.length} findings`);
  }

  fs.rmSync(cacheTmp, { recursive: true, force: true });

  const coldMedianMs = median(coldRuns.map((r) => r.durationMs));
  const warmMedianMs = median(warmRuns.map((r) => r.durationMs));
  const cacheSpeedup = warmMedianMs > 0 ? coldMedianMs / warmMedianMs : null;

  // Drift check: cached output must equal fresh output
  const drift = diffFindings(coldFindings, warmFindings);
  const driftCount = drift.onlyInA.length + drift.onlyInB.length;
  const cacheCorrect = driftCount === 0;

  const fileCount = coldRuns[0]?.fileCount ?? 1;
  const coldMsPerFile = coldMedianMs / fileCount;
  const warmMsPerFile = warmMedianMs / fileCount;

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Cache-Matrix',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: {
      ruleSurvivalRate: cacheCorrect ? 1 : Math.max(0, 1 - driftCount / Math.max(1, coldFindings?.length ?? 1)),
    },
    latency: {
      meanLatencyMs: coldMedianMs,
      coldMedianMs,
      warmMedianMs,
      msPerFile: coldMsPerFile,
    },
    cold: { medianMs: coldMedianMs, msPerFile: coldMsPerFile, runs: coldRuns.length },
    warm: { medianMs: warmMedianMs, msPerFile: warmMsPerFile, runs: warmRuns.length },
    cacheSpeedup,
    cacheCorrect,
    drift: cacheCorrect ? null : drift,
    fileCount,
    corpus: path.relative(REPO_ROOT, CORPUS),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  console.log(`Cold median: ${coldMedianMs.toFixed(0)}ms  (${coldMsPerFile.toFixed(2)} ms/file)`);
  console.log(`Warm median: ${warmMedianMs.toFixed(0)}ms  (${warmMsPerFile.toFixed(2)} ms/file)`);
  console.log(`Cache speedup: ${cacheSpeedup ? cacheSpeedup.toFixed(1) + '×' : 'n/a'}  ${cacheSpeedup && cacheSpeedup >= 10 ? '✅' : '⚠️ (SLO ≥ 10×)'}`);
  console.log(`Cache correctness: ${cacheCorrect ? '✅ identical findings' : `❌ drift ${driftCount} entries`}`);
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
  process.exit(cacheCorrect ? 0 : 1);
}

main().catch((err) => {
  console.error('ILB-Cache-Matrix fatal:', err);
  process.exit(2);
});
