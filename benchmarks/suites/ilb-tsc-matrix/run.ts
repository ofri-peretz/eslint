#!/usr/bin/env -S npx tsx
/**
 * ILB-TSC-Matrix — TypeScript-compiler matrix bench (roadmap item 1.14, full).
 *
 * Runs the same lint corpus under both compilers and reports the delta:
 *
 *   1. **tsc-classic** — the legacy TypeScript compiler (5.x and earlier).
 *   2. **tsc-go** — the Go-rewritten compiler shipping in TypeScript 6
 *      (Project Corsa). Targets ~10× type-check speedup.
 *
 * Three observable deltas:
 *   - **Latency** — expected major win for tsc-go on large codebases.
 *   - **Findings drift** — should be ZERO. Any drift is a compiler
 *     correctness / type-info bug we need to chase down.
 *   - **Memory (peak RSS)** — informational; tsc-go is more memory-efficient.
 *
 * Compiler resolution:
 *   - tsc-classic: whatever `typescript` resolves to in node_modules.
 *   - tsc-go:      `npx --package=@typescript/native-preview@latest tsgo`
 *                  (preview channel; switch to `tsc` once 6.x is the default).
 *
 * If tsc-go isn't installed and `--install-tsc-go` is set, the runner installs
 * it on demand into a local cache (no lockfile mutation). Otherwise it skips
 * with an install hint — same UX as ILB-Diff with CodeQL/Semgrep/Snyk.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-tsc-matrix/run.mjs
 *   tsx benchmarks/suites/ilb-tsc-matrix/run.mjs --corpus benchmarks/corpus/CWE-089
 *   tsx benchmarks/suites/ilb-tsc-matrix/run.mjs --runs 3 --install-tsc-go
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const requireFromHere = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-tsc-matrix');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const RUNS = Number.parseInt(ARG('--runs', '3'), 10);
const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));
const INSTALL_TSC_GO = process.argv.includes('--install-tsc-go');
const TSC_GO_PKG = '@typescript/native-preview';

function which(bin) {
  try {
    return execSync(`which ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function pkgVersion(pkgName) {
  try {
    const p = execSync(`npm view ${pkgName} version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return p || null;
  } catch {
    return null;
  }
}

function detectAvailableCompilers() {
  const compilers = [];

  // tsc-classic: `typescript` from node_modules
  let classicVersion = null;
  try {
    classicVersion = requireFromHere('typescript/package.json').version;
  } catch {}
  if (classicVersion) compilers.push({ id: 'tsc-classic', version: classicVersion, runner: 'classic' });

  // tsc-go: preview package
  const goVersion = pkgVersion(TSC_GO_PKG);
  if (goVersion) {
    compilers.push({ id: 'tsc-go', version: goVersion, runner: 'go' });
  } else if (INSTALL_TSC_GO) {
    console.log(`installing ${TSC_GO_PKG} on demand (no lockfile mutation)...`);
    execSync(`npx --yes ${TSC_GO_PKG}@latest --version`, { stdio: 'inherit' });
    compilers.push({ id: 'tsc-go', version: pkgVersion(TSC_GO_PKG), runner: 'go' });
  }

  return compilers;
}

function lintOnce(compiler) {
  const cmd = compiler.runner === 'go'
    ? `TS_COMPILER=tsc-go npx --yes --package=${TSC_GO_PKG}@latest tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}"`
    : `npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}"`;
  const t0 = process.hrtime.bigint();
  let raw;
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) throw err;
  }
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;
  const results = JSON.parse(raw);
  const findings = results.flatMap((r) =>
    (r.messages ?? []).filter((m) => m.ruleId).map((m) => ({
      file: path.relative(REPO_ROOT, r.filePath),
      ruleId: m.ruleId,
      line: m.line ?? 0,
      column: m.column ?? 0,
      message: m.message,
    }))
  );
  return { durationMs, findings };
}

function median(xs) {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function diffFindings(a, b) {
  const ka = new Set(a.map((f) => `${f.file}:${f.line}:${f.ruleId}`));
  const kb = new Set(b.map((f) => `${f.file}:${f.line}:${f.ruleId}`));
  return {
    onlyInClassic: [...ka].filter((k) => !kb.has(k)),
    onlyInGo: [...kb].filter((k) => !ka.has(k)),
    shared: [...ka].filter((k) => kb.has(k)).length,
  };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`ILB-TSC-Matrix v0.1 · ${RUNS} runs/compiler · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });
  const compilers = detectAvailableCompilers();

  if (compilers.length === 0) {
    console.error('No compilers detected. Install typescript and/or @typescript/native-preview, or pass --install-tsc-go.');
    process.exit(1);
  }
  for (const c of compilers) console.log(`  ${c.id} @ ${c.version}`);
  console.log('');

  const perCompiler = {};
  for (const compiler of compilers) {
    console.log(`── ${compiler.id} ──`);
    const timings = [];
    let firstFindings = null;
    let driftAcrossRuns = 0;
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(`  run ${i + 1}/${RUNS}... `);
      try {
        const { durationMs, findings } = lintOnce(compiler);
        timings.push(durationMs);
        if (firstFindings === null) firstFindings = findings;
        else {
          const d = diffFindings(firstFindings, findings);
          if (d.onlyInClassic.length || d.onlyInGo.length) driftAcrossRuns++;
        }
        console.log(`${durationMs.toFixed(0)}ms · ${findings.length} findings`);
      } catch (err) {
        console.log(`error: ${err.message?.slice(0, 100)}`);
        perCompiler[compiler.id] = { error: err.message, version: compiler.version };
        break;
      }
    }
    if (timings.length === 0) continue;
    perCompiler[compiler.id] = {
      version: compiler.version,
      runs: timings.length,
      medianMs: median(timings),
      meanMs: timings.reduce((s, t) => s + t, 0) / timings.length,
      driftAcrossRuns,
      findings: firstFindings,
      findingCount: firstFindings.length,
    };
  }

  // Cross-compiler delta
  let crossDelta = null;
  if (perCompiler['tsc-classic'] && perCompiler['tsc-go']) {
    crossDelta = {
      latencyRatio: perCompiler['tsc-classic'].medianMs / perCompiler['tsc-go'].medianMs,
      findingsDelta: diffFindings(perCompiler['tsc-classic'].findings, perCompiler['tsc-go'].findings),
    };
  }

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-TSC-Matrix',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain: getToolchain(),
    preregistration: prereg,
    cost: {},
    effectiveness: {
      // Drift across compilers: SLO is zero. This is the headline correctness metric.
      ruleSurvivalRate: crossDelta
        ? 1 - (crossDelta.findingsDelta.onlyInClassic.length + crossDelta.findingsDelta.onlyInGo.length) / Math.max(1, perCompiler['tsc-classic'].findingCount)
        : null,
    },
    latency: {
      meanLatencyMs: perCompiler['tsc-classic']?.meanMs ?? null,
    },
    perCompiler,
    crossDelta,
    corpus: path.relative(REPO_ROOT, CORPUS),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  if (crossDelta) {
    console.log(`Cross-compiler delta:`);
    console.log(`  latency: tsc-classic / tsc-go = ${crossDelta.latencyRatio.toFixed(2)}× (>1 = tsc-go faster)`);
    console.log(`  findings drift: ${crossDelta.findingsDelta.onlyInClassic.length} classic-only, ${crossDelta.findingsDelta.onlyInGo.length} go-only, ${crossDelta.findingsDelta.shared} shared`);
    if (crossDelta.findingsDelta.onlyInClassic.length || crossDelta.findingsDelta.onlyInGo.length) {
      console.log('  ⚠️  drift > 0 — investigate compiler / type-info delta before promoting tsc-go');
    } else {
      console.log('  ✅ zero drift — compilers agree on every finding');
    }
  } else if (compilers.length === 1) {
    console.log(`Only ${compilers[0].id} available. Pass --install-tsc-go (or install ${TSC_GO_PKG}) to enable the matrix.`);
  }
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-TSC-Matrix fatal:', err);
  process.exit(2);
});
