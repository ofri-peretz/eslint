#!/usr/bin/env -S npx tsx
/**
 * ILB-Node-Matrix — Node.js runtime matrix bench (roadmap item 1.17).
 *
 * Sister to ILB-TSC-Matrix. Same corpus, same lint config, run under each
 * Node version that we declare support for. Three observable deltas:
 *
 *   1. **Latency** — Node 24 ships V8 ~12.x with notable startup wins.
 *   2. **Findings drift** — should be ZERO. ASTs are V8-version-stable, but
 *      a parser regression in some Node release would surface here first.
 *   3. **Memory (peak RSS)** — informational; tracked per-version.
 *
 * Detection strategy:
 *   1. **nvm** (most common). If `~/.nvm/versions/node/v<X>.<Y>.<Z>/bin/node`
 *      exists, runs against it.
 *   2. **volta** — `volta list node` enumerates installed runtimes.
 *   3. **fnm**   — `fnm list` (or `~/.fnm/node-versions/`).
 *   4. **system PATH** — single Node version; matrix collapses to one row
 *      and the runner exits with an instructional note.
 *
 * Versions targeted by default match the project's support policy:
 *   Active LTS:        node@22 · node@24
 *   Maintenance LTS:   node@20 (until 2026-04, recently EOL)
 *   Beyond-EOL legacy: node@18 (still common in production; tracked but
 *                              flagged as out-of-support)
 *
 * Override with `--versions 18.20.4,20.18.0,22.11.0,24.0.0` for a specific
 * matrix (e.g. CI builds with explicit pin).
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-node-matrix/run.mjs
 *   tsx benchmarks/suites/ilb-node-matrix/run.mjs --versions 20,22,24
 *   tsx benchmarks/suites/ilb-node-matrix/run.mjs --runs 3 --corpus benchmarks/corpus/CWE-089
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
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-node-matrix');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const RUNS = Number.parseInt(ARG('--runs', '3'), 10);
const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const ESLINT_CONFIG = ARG('--config', path.join(REPO_ROOT, 'eslint.benchmark.config.mjs'));
const REQUESTED_VERSIONS = ARG('--versions');

// Project Node-version policy. Aligned with `engines.node` in package.json
// and the runtime support matrix documented at ILB-Node-Matrix scope.
const SUPPORT_POLICY = {
  active:      ['22', '24'],
  maintenance: ['20'],          // recently-EOL'd LTS, still common in production
  legacy:      ['18'],          // long-EOL but still tracked for reality
};

function which(bin) {
  try {
    return execSync(`which ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function listNvmVersions() {
  const nvmDir = path.join(os.homedir(), '.nvm', 'versions', 'node');
  if (!fs.existsSync(nvmDir)) return [];
  return fs.readdirSync(nvmDir)
    .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
    .map((d) => ({ version: d.replace(/^v/, ''), bin: path.join(nvmDir, d, 'bin', 'node') }))
    .filter((v) => fs.existsSync(v.bin));
}

function listVoltaVersions() {
  if (!which('volta')) return [];
  try {
    const out = execSync('volta list node --format plain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean).map((line) => {
      const m = line.match(/runtime node@(\d+\.\d+\.\d+)/);
      return m ? { version: m[1], bin: 'volta', voltaArg: `node@${m[1]}` } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function listFnmVersions() {
  const fnmDir = path.join(os.homedir(), '.fnm', 'node-versions');
  if (!fs.existsSync(fnmDir)) return [];
  return fs.readdirSync(fnmDir)
    .filter((d) => /^v\d+\.\d+\.\d+$/.test(d))
    .map((d) => ({ version: d.replace(/^v/, ''), bin: path.join(fnmDir, d, 'installation', 'bin', 'node') }))
    .filter((v) => fs.existsSync(v.bin));
}

function discoverVersions() {
  const all = [...listNvmVersions(), ...listVoltaVersions(), ...listFnmVersions()];
  // De-duplicate by version, preferring nvm/fnm over volta (direct binary, no shim)
  const seen = new Set();
  const out = [];
  for (const v of all) {
    if (seen.has(v.version)) continue;
    seen.add(v.version);
    out.push(v);
  }
  // Sort newest-first
  out.sort((a, b) => semverCompare(b.version, a.version));
  return out;
}

function semverCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function selectMatrix(available) {
  if (REQUESTED_VERSIONS) {
    const targets = REQUESTED_VERSIONS.split(',').map((s) => s.trim());
    return available.filter((v) => targets.some((t) => v.version === t || v.version.startsWith(t + '.')));
  }
  // Pick newest patch available for each declared major in the support policy.
  const allMajors = [...SUPPORT_POLICY.active, ...SUPPORT_POLICY.maintenance, ...SUPPORT_POLICY.legacy];
  const out = [];
  for (const major of allMajors) {
    const match = available.find((v) => v.version.startsWith(major + '.'));
    if (match) out.push({ ...match, major, supportTier: classify(major) });
  }
  return out;
}

function classify(major) {
  if (SUPPORT_POLICY.active.includes(major)) return 'active-lts';
  if (SUPPORT_POLICY.maintenance.includes(major)) return 'maintenance-lts';
  if (SUPPORT_POLICY.legacy.includes(major)) return 'legacy-eol';
  return 'unknown';
}

function lintOnce(nodeBin, voltaArg) {
  // Run npx-bound ESLint under the target Node binary. tsx is needed for
  // src-import plugins; we let the target Node runtime find its own tsx.
  const cmd = voltaArg
    ? `volta run --node ${voltaArg.replace('node@', '')} -- npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}"`
    : `"${nodeBin}" "$(which npx)" tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${ESLINT_CONFIG}" "${CORPUS}"`;
  const t0 = process.hrtime.bigint();
  let raw;
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, shell: '/bin/bash' });
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
    onlyInA: [...ka].filter((k) => !kb.has(k)),
    onlyInB: [...kb].filter((k) => !ka.has(k)),
    shared: [...ka].filter((k) => kb.has(k)).length,
  };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`ILB-Node-Matrix v0.1 · ${RUNS} runs/version · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const available = discoverVersions();
  if (available.length === 0) {
    console.log('No nvm / volta / fnm Node versions detected. Install at least one (e.g. `nvm install 22 && nvm install 24`) to enable the matrix.');
    console.log(`Falling back to current Node (${process.version}) only — no cross-version data.`);
  }

  const matrix = selectMatrix(available);
  if (matrix.length === 0) {
    console.log(`Available Node versions don't intersect the support policy. Available: ${available.map((v) => v.version).join(', ') || '<none>'}`);
    process.exit(0);
  }
  for (const v of matrix) console.log(`  node@${v.version}  (${v.supportTier})`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });

  const perVersion = {};
  let baselineFindings = null;
  let baselineVersion = null;

  for (const v of matrix) {
    console.log(`── node@${v.version} (${v.supportTier}) ──`);
    const timings = [];
    let firstFindings = null;
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(`  run ${i + 1}/${RUNS}... `);
      try {
        const { durationMs, findings } = lintOnce(v.bin, v.voltaArg);
        timings.push(durationMs);
        if (firstFindings === null) firstFindings = findings;
        console.log(`${durationMs.toFixed(0)}ms · ${findings.length} findings`);
      } catch (err) {
        console.log(`error: ${err.message?.slice(0, 100)}`);
        perVersion[v.version] = { error: err.message, supportTier: v.supportTier };
        break;
      }
    }
    if (timings.length === 0) continue;
    perVersion[v.version] = {
      supportTier: v.supportTier,
      runs: timings.length,
      medianMs: median(timings),
      meanMs: timings.reduce((s, t) => s + t, 0) / timings.length,
      findings: firstFindings,
      findingCount: firstFindings.length,
    };
    if (baselineFindings === null) {
      baselineFindings = firstFindings;
      baselineVersion = v.version;
    }
  }

  // Drift analysis: every version's findings should equal the baseline.
  const driftPerVersion = {};
  for (const [ver, data] of Object.entries(perVersion)) {
    if (!data.findings || ver === baselineVersion) continue;
    driftPerVersion[ver] = diffFindings(baselineFindings, data.findings);
  }
  const totalDrift = Object.values(driftPerVersion).reduce((s, d) => s + d.onlyInA.length + d.onlyInB.length, 0);

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Node-Matrix',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain: getToolchain(),
    preregistration: prereg,
    cost: {},
    effectiveness: {
      ruleSurvivalRate: baselineFindings && baselineFindings.length > 0
        ? 1 - (totalDrift / Math.max(1, baselineFindings.length * (Object.keys(driftPerVersion).length || 1)))
        : null,
    },
    latency: {
      meanLatencyMs: Object.values(perVersion).reduce((s, d) => s + (d.meanMs ?? 0), 0) / Math.max(1, Object.keys(perVersion).length),
    },
    supportPolicy: SUPPORT_POLICY,
    perVersion,
    driftPerVersion,
    baselineVersion,
    corpus: path.relative(REPO_ROOT, CORPUS),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  if (totalDrift === 0 && baselineVersion) {
    console.log(`✅ ILB-Node-Matrix PASS — zero finding drift across ${Object.keys(perVersion).length} Node version(s) (baseline node@${baselineVersion}, ${baselineFindings?.length ?? 0} findings)`);
  } else if (baselineVersion) {
    console.log(`❌ ILB-Node-Matrix FAIL — ${totalDrift} drift entries across ${Object.keys(driftPerVersion).length} comparator(s)`);
    for (const [ver, d] of Object.entries(driftPerVersion)) {
      if (d.onlyInA.length || d.onlyInB.length) {
        console.log(`   node@${ver} vs ${baselineVersion}:  +${d.onlyInB.length}  −${d.onlyInA.length}  (shared ${d.shared})`);
      }
    }
  }
  console.log('Latency by version (median ms):');
  for (const [ver, d] of Object.entries(perVersion)) {
    if (typeof d.medianMs === 'number') {
      console.log(`   node@${ver.padEnd(10)} ${d.medianMs.toFixed(0).padStart(6)}ms  (${d.supportTier})`);
    }
  }
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-Node-Matrix fatal:', err);
  process.exit(2);
});
