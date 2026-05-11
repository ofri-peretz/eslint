#!/usr/bin/env -S npx tsx
/**
 * ILB-ESLint-Matrix — ESLint major-version matrix bench (roadmap item 1.19).
 *
 * Sister to ILB-Node-Matrix and ILB-TSC-Matrix. Same corpus, same lint config,
 * run under each ESLint major we declare support for. Three observable deltas:
 *
 *   1. **Latency** — ESLint v9 dropped the legacy config loader; v10 brings
 *      flat-config-only and worker improvements. Real-world deltas matter.
 *   2. **Findings drift** — should be ZERO. ESLint majors that cause drift
 *      indicate breaking changes in our rule context (`SourceCode` API,
 *      `ScopeAnalyser`, etc.) that we need to abstract.
 *   3. **Plugin compat** — does each plugin even *load* under that major?
 *
 * Resolution: uses `npx -p eslint@<major>` per major to install on demand
 * into npx's cache (no devDependency mutation, no lockfile churn).
 *
 * Support policy (from package.json `engines.eslint` and the existing
 * `.github/workflows/eslint-version-matrix.yml`):
 *   Active majors:    9, 10
 *   Maintenance:      8 (still very common)
 *   Out of support:   7 and earlier (Node 14-only, irrelevant)
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-eslint-matrix/run.mjs
 *   tsx benchmarks/suites/ilb-eslint-matrix/run.mjs --majors 8,9,10
 *   tsx benchmarks/suites/ilb-eslint-matrix/run.mjs --runs 3
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-eslint-matrix');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const RUNS = Number.parseInt(ARG('--runs', '2'), 10);
const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));
const REQUESTED_MAJORS = ARG('--majors')?.split(',').map((s) => s.trim());

const SUPPORT_POLICY = {
  active: ['9', '10'],
  maintenance: ['8'],
  outOfSupport: ['7'],
};

function classify(major) {
  if (SUPPORT_POLICY.active.includes(major)) return 'active';
  if (SUPPORT_POLICY.maintenance.includes(major)) return 'maintenance';
  if (SUPPORT_POLICY.outOfSupport.includes(major)) return 'out-of-support';
  return 'unknown';
}

function lintWithEslintMajor(major) {
  // Use npx to install/run a specific ESLint major into its cache.
  // tsx is required because the bench config imports plugin TS sources directly.
  const cmd = `npx --yes -p eslint@${major} -p tsx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}" 2>/dev/null || true`;
  // Note: when ESLint major resolves through npx-isolated cache, the bin path
  // differs. The fallback below tries direct invocation.
  let raw;
  const t0 = process.hrtime.bigint();
  try {
    raw = execSync(`npx --yes -p eslint@${major} -p tsx --quiet sh -c 'tsx "$(npm root -g 2>/dev/null)/eslint/bin/eslint.js" --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}" 2>/dev/null || tsx "$(which eslint)" --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}"'`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, shell: '/bin/bash',
    });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
  }
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;
  if (!raw.trim()) return { error: 'eslint command produced no output (config/parser incompat?)', durationMs };
  let results;
  try { results = JSON.parse(raw); } catch (e) {
    return { error: `non-JSON output: ${raw.slice(0, 200)}`, durationMs };
  }
  const findings = results.flatMap((r) => (r.messages ?? []).filter((m) => m.ruleId).map((m) => ({
    file: path.relative(REPO_ROOT, r.filePath), ruleId: m.ruleId, line: m.line ?? 0,
  })));
  return { durationMs, findings };
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

  const majors = REQUESTED_MAJORS ?? [...SUPPORT_POLICY.active, ...SUPPORT_POLICY.maintenance];
  console.log(`ILB-ESLint-Matrix v0.1 · ${RUNS} runs/major · majors=${majors.join(',')} · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });

  const perMajor = {};
  let baselineFindings = null;
  let baselineMajor = null;

  for (const major of majors) {
    console.log(`── eslint@${major} (${classify(major)}) ──`);
    const timings = [];
    let firstFindings = null;
    let firstError = null;
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(`  run ${i + 1}/${RUNS}... `);
      const r = lintWithEslintMajor(major);
      if (r.error) {
        console.log(`error: ${r.error.slice(0, 80)}`);
        firstError = firstError ?? r.error;
        break;
      }
      timings.push(r.durationMs);
      if (firstFindings === null) firstFindings = r.findings;
      console.log(`${r.durationMs.toFixed(0)}ms · ${r.findings.length} findings`);
    }
    if (timings.length === 0) {
      perMajor[major] = { error: firstError, supportTier: classify(major) };
      continue;
    }
    perMajor[major] = {
      supportTier: classify(major),
      runs: timings.length,
      medianMs: median(timings),
      meanMs: timings.reduce((s, t) => s + t, 0) / timings.length,
      findings: firstFindings,
      findingCount: firstFindings.length,
    };
    if (baselineFindings === null) {
      baselineFindings = firstFindings;
      baselineMajor = major;
    }
  }

  const driftPerMajor: Record<string, any> = {};
  for (const [major, data] of Object.entries(perMajor) as Array<[string, any]>) {
    if (!data.findings || major === baselineMajor) continue;
    driftPerMajor[major] = diffFindings(baselineFindings, data.findings);
  }
  const totalDrift: number = (Object.values(driftPerMajor) as any[]).reduce((s: number, d: any) => s + d.onlyInA.length + d.onlyInB.length, 0);

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-ESLint-Matrix',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: {
      ruleSurvivalRate: baselineFindings && baselineFindings.length > 0
        ? 1 - (totalDrift / Math.max(1, baselineFindings.length * (Object.keys(driftPerMajor).length || 1)))
        : null,
    },
    latency: {
      meanLatencyMs: (Object.values(perMajor) as any[]).reduce((s: number, d: any) => s + (d.meanMs ?? 0), 0) / Math.max(1, Object.keys(perMajor).length),
    },
    supportPolicy: SUPPORT_POLICY,
    perMajor,
    driftPerMajor,
    baselineMajor,
    corpus: path.relative(REPO_ROOT, CORPUS),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  if (totalDrift === 0 && baselineMajor) {
    console.log(`✅ ILB-ESLint-Matrix PASS — zero drift across ${Object.keys(perMajor).filter((k) => perMajor[k].findings).length} ESLint major(s) (baseline eslint@${baselineMajor})`);
  } else if (baselineMajor) {
    console.log(`⚠️  ${totalDrift} drift entries across ${Object.keys(driftPerMajor).length} comparator(s)`);
  }
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-ESLint-Matrix fatal:', err);
  process.exit(2);
});
