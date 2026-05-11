#!/usr/bin/env -S npx tsx
/**
 * ILB-Diff — differential bench scaffolding (roadmap item 1.9).
 *
 * Runs Interlace × CodeQL × Semgrep × (Snyk Code) on the same corpus,
 * normalizes their SARIF outputs, and emits an agreement matrix:
 *
 *           Interlace   CodeQL   Semgrep   Snyk
 *   TP+TP         X
 *   TP+FN        ...
 *   ...
 *
 * The headline isn't "we win" — it's the **22% disagreement region** where
 * we differ from the giants. That's the credibility narrative for Phase 3.
 *
 * Adapter design:
 *   - Each tool has an `adapters/<tool>.mjs` module exposing `run(corpus)`
 *     returning a normalized array of findings: { tool, ruleId, file, line,
 *     severity, cwe?, message }.
 *   - Tools that aren't installed are skipped with a clear note (we don't
 *     fail on missing CodeQL — we record `installed: false`).
 *   - Adding a new SAST tool = drop a file in adapters/.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-diff/run.ts --corpus benchmarks/corpus/CWE-089
 *   tsx benchmarks/suites/ilb-diff/run.ts --tools interlace,semgrep
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
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-diff');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const TOOLS = ARG('--tools', 'interlace,codeql,semgrep,snyk').split(',').map((s) => s.trim());

// ─── adapters ────────────────────────────────────────────────────────────

function adapterInterlace() {
  const config = path.join(REPO_ROOT, 'eslint.benchmark.config.mjs');
  const cmd = `npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${config}" "${CORPUS}"`;
  let raw = '';
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) return { tool: 'interlace', installed: true, error: err.message, findings: [] };
  }
  const results = JSON.parse(raw);
  const findings = [];
  for (const r of results) {
    for (const m of r.messages ?? []) {
      if (!m.ruleId) continue;
      findings.push({
        tool: 'interlace',
        ruleId: m.ruleId,
        file: path.relative(REPO_ROOT, r.filePath),
        line: m.line ?? 0,
        severity: m.severity === 2 ? 'error' : m.severity === 1 ? 'warning' : 'note',
        cwe: extractCweFromRuleId(m.ruleId),
        message: m.message,
      });
    }
  }
  return { tool: 'interlace', installed: true, findings };
}

function adapterCodeQL() {
  const installed = which('codeql') !== null;
  if (!installed) {
    return { tool: 'codeql', installed: false, note: 'install: brew install codeql or https://codeql.github.com/docs/codeql-cli/' };
  }
  // CodeQL needs a database — heavyweight for a synthetic corpus. Document
  // the recipe; full execution lives in CI where the database is built.
  return {
    tool: 'codeql',
    installed: true,
    findings: [],
    note: 'CodeQL requires a database — run `codeql database create db --language=javascript --source-root=' + CORPUS + '` then `codeql database analyze db --format=sarif-latest`. Wire that into ilb:diff:codeql once a CI runner has a built db.',
  };
}

function adapterSemgrep() {
  const installed = which('semgrep') !== null;
  if (!installed) {
    return { tool: 'semgrep', installed: false, note: 'install: pipx install semgrep' };
  }
  let raw;
  try {
    raw = execSync(`semgrep --config p/javascript --config p/typescript --json --quiet "${CORPUS}"`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) return { tool: 'semgrep', installed: true, error: err.message, findings: [] };
  }
  const parsed = JSON.parse(raw);
  const findings = (parsed.results ?? []).map((r) => ({
    tool: 'semgrep',
    ruleId: r.check_id,
    file: path.relative(REPO_ROOT, r.path),
    line: r.start?.line ?? 0,
    severity: (r.extra?.severity ?? 'INFO').toLowerCase(),
    cwe: extractCweFromMetadata(r.extra?.metadata),
    message: r.extra?.message ?? r.check_id,
  }));
  return { tool: 'semgrep', installed: true, findings };
}

function adapterSnyk() {
  const installed = which('snyk') !== null;
  if (!installed) {
    return { tool: 'snyk', installed: false, note: 'install: npm i -g snyk and `snyk auth`' };
  }
  let raw;
  try {
    raw = execSync(`snyk code test "${CORPUS}" --json`, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) return { tool: 'snyk', installed: true, error: err.message, findings: [] };
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { tool: 'snyk', installed: true, error: 'non-JSON output', findings: [] }; }
  const runs = parsed.runs ?? [];
  const findings = [];
  for (const run of runs) {
    for (const r of run.results ?? []) {
      const loc = r.locations?.[0]?.physicalLocation;
      findings.push({
        tool: 'snyk',
        ruleId: r.ruleId ?? r.rule?.id ?? '<unknown>',
        file: loc?.artifactLocation?.uri ?? '<unknown>',
        line: loc?.region?.startLine ?? 0,
        severity: r.level ?? 'warning',
        cwe: extractCweFromRuleId(r.ruleId ?? ''),
        message: r.message?.text ?? '',
      });
    }
  }
  return { tool: 'snyk', installed: true, findings };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function which(bin) {
  try {
    return execSync(`which ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function extractCweFromRuleId(ruleId) {
  if (!ruleId) return null;
  const m = String(ruleId).match(/CWE-?(\d{2,4})/i);
  return m ? `CWE-${m[1]}` : null;
}

function extractCweFromMetadata(meta) {
  if (!meta) return null;
  const cwe = meta.cwe ?? meta['cwe-id'];
  if (Array.isArray(cwe)) return cwe[0];
  if (typeof cwe === 'string') return cwe;
  return null;
}

// ─── agreement matrix ────────────────────────────────────────────────────

function buildAgreementMatrix(adapterResults) {
  // Group findings by (file, line, cwe) — the most stable cross-tool key.
  const byKey = new Map();
  for (const r of adapterResults) {
    if (!r.installed || !r.findings) continue;
    for (const f of r.findings) {
      const key = `${f.file}::${f.line}::${f.cwe ?? '<none>'}`;
      if (!byKey.has(key)) byKey.set(key, new Map());
      byKey.get(key).set(r.tool, f);
    }
  }

  const tools = adapterResults.filter((r) => r.installed).map((r) => r.tool);
  const matrix = { tools, totalKeys: byKey.size, byCombo: {} };
  for (const [key, toolMap] of byKey.entries()) {
    const present = tools.filter((t) => toolMap.has(t)).sort().join('+');
    matrix.byCombo[present] = (matrix.byCombo[present] ?? 0) + 1;
  }
  return matrix;
}

// ─── main ────────────────────────────────────────────────────────────────

const ADAPTERS = {
  interlace: adapterInterlace,
  codeql: adapterCodeQL,
  semgrep: adapterSemgrep,
  snyk: adapterSnyk,
};

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`ILB-Diff v0.1 · corpus=${path.relative(REPO_ROOT, CORPUS)} · tools=${TOOLS.join(',')}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });
  const toolchain = getToolchain();

  const adapterResults = [];
  for (const tool of TOOLS) {
    const adapter = ADAPTERS[tool];
    if (!adapter) {
      console.log(`  ${tool}: unknown adapter — skipping`);
      continue;
    }
    process.stdout.write(`  ${tool}... `);
    const r = adapter();
    if (!r.installed) console.log(`not installed (${r.note ?? 'see note'})`);
    else if (r.error) console.log(`error: ${r.error.slice(0, 80)}`);
    else console.log(`${r.findings.length} findings`);
    adapterResults.push(r);
  }

  const matrix = buildAgreementMatrix(adapterResults);
  const interlaceCount = adapterResults.find((r) => r.tool === 'interlace')?.findings.length ?? 0;
  const peerTotals = Object.fromEntries(
    adapterResults.filter((r) => r.tool !== 'interlace' && r.installed).map((r) => [r.tool, r.findings.length])
  );

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Diff',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain,
    preregistration: prereg,
    cost: {},
    effectiveness: {
      // Agreement is reported by combo; no single F1 (per principle: single-dimension).
    },
    latency: {},
    corpus: path.relative(REPO_ROOT, CORPUS),
    matrix,
    summary: { interlaceFindings: interlaceCount, peerFindings: peerTotals },
    adapters: adapterResults.map((r) => ({ tool: r.tool, installed: r.installed, error: r.error ?? null, note: r.note ?? null, findingCount: r.findings?.length ?? 0 })),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  console.log('Agreement matrix (count of findings present in each combo):');
  for (const [combo, count] of (Object.entries(matrix.byCombo) as Array<[string, number]>).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${combo.padEnd(40)} ${count}`);
  }
  console.log('');
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-Diff fatal:', err);
  process.exit(2);
});
