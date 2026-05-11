#!/usr/bin/env -S npx tsx
/**
 * ILB-Parser-Matrix — language / parser-mode matrix bench (roadmap item 1.20).
 *
 * Codifies the parser-fallback chain: every fixture is linted under each of
 *
 *   1. **js**       — vanilla espree, no JSX, no TS
 *   2. **js+jsx**   — espree with JSX, React-style code
 *   3. **ts**       — @typescript-eslint/parser, no JSX
 *   4. **ts+jsx**   — @typescript-eslint/parser with JSX (.tsx)
 *
 * Three observable deltas:
 *   - **Findings drift across parser modes** — should be ZERO on JS-syntax
 *     fixtures. Drift indicates a rule depends on parser-specific node types
 *     (e.g. `TSAsExpression`) and breaks for non-TS users.
 *   - **Parser-failure rate** — how many fixtures need to fall back to a
 *     more permissive parser? Tells us where our config docs need to add
 *     "if you have JSX, use this parser" hints.
 *   - **Latency per parser** — TS parser is ~2-3× slower than espree. We
 *     surface this so users on JS-only codebases know the cost of the TS
 *     parser is opt-in, not baseline.
 *
 * Why this matters: the support claim is "Interlace works on any JS or TS
 * codebase, modern or legacy." Without this matrix, that claim is vibes;
 * with it, every parser-mode regression is caught at PR time.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-parser-matrix/run.mjs
 *   tsx benchmarks/suites/ilb-parser-matrix/run.mjs --modes js,ts
 *   tsx benchmarks/suites/ilb-parser-matrix/run.mjs --corpus benchmarks/corpus/CWE-079
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
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-parser-matrix');

const ARG = (flag, fallback = null) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const CORPUS = path.resolve(ARG('--corpus', path.join(REPO_ROOT, 'benchmarks', 'corpus', 'CWE-089')));
const REQUESTED_MODES = (ARG('--modes') ?? 'js,js+jsx,ts,ts+jsx').split(',').map((s) => s.trim());

const PARSER_MODES = {
  'js':       { parser: null,                            jsx: false, ext: '.js',  needsTsParser: false },
  'js+jsx':   { parser: null,                            jsx: true,  ext: '.jsx', needsTsParser: false },
  'ts':       { parser: '@typescript-eslint/parser',    jsx: false, ext: '.ts',  needsTsParser: true  },
  'ts+jsx':   { parser: '@typescript-eslint/parser',    jsx: true,  ext: '.tsx', needsTsParser: true  },
};

/**
 * Build a flat-config snippet that pins one parser/JSX mode + the secure-coding
 * plugin. Written to a temp dir so it can sit alongside the corpus fixtures.
 */
function buildFlatConfig(mode) {
  const m = PARSER_MODES[mode];
  if (!m) throw new Error(`unknown parser mode: ${mode}`);
  return `import securityPlugin from '${path.join(REPO_ROOT, 'packages', 'eslint-plugin-secure-coding', 'src', 'index.ts').replaceAll('\\\\', '/')}';
${m.parser ? `import * as tsParser from '${m.parser}';` : ''}
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    plugins: { 'secure-coding': securityPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ${m.parser ? `parser: tsParser,` : ''}
      parserOptions: {
        ecmaFeatures: { jsx: ${m.jsx} },
        ${m.needsTsParser ? `project: false,` : ''}
      },
    },
    rules: securityPlugin.configs?.recommended?.rules ?? {},
  },
];`;
}

function lintCorpusUnderMode(mode) {
  const m = PARSER_MODES[mode];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilb-parser-'));
  const cfgPath = path.join(tmpDir, 'eslint.config.mjs');
  fs.writeFileSync(cfgPath, buildFlatConfig(mode), 'utf8');

  const t0 = process.hrtime.bigint();
  let raw = '';
  try {
    raw = execSync(`npx tsx ./node_modules/eslint/bin/eslint.js --no-error-on-unmatched-pattern --format json --config "${cfgPath}" "${CORPUS}"`, {
      cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    raw = err.stdout?.toString() ?? '';
    if (!raw) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return { error: err.message?.slice(0, 200), durationMs: 0 };
    }
  }
  const t1 = process.hrtime.bigint();
  const durationMs = Number(t1 - t0) / 1e6;
  fs.rmSync(tmpDir, { recursive: true, force: true });

  let results;
  try { results = JSON.parse(raw); } catch (e) {
    return { error: `non-JSON output: ${raw.slice(0, 200)}`, durationMs };
  }

  let parserFailures = 0;
  const findings = [];
  for (const r of results) {
    for (const m of r.messages ?? []) {
      if (m.fatal && /Parsing error/i.test(m.message ?? '')) parserFailures++;
      else if (m.ruleId) findings.push({ file: path.relative(REPO_ROOT, r.filePath), ruleId: m.ruleId, line: m.line ?? 0 });
    }
  }
  return { durationMs, findings, parserFailures, parsedFiles: results.length };
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

  console.log(`ILB-Parser-Matrix v0.1 · modes=${REQUESTED_MODES.join(',')} · corpus=${path.relative(REPO_ROOT, CORPUS)}`);
  console.log('');

  const prereg = capturePreregistration({ allowDirty: true });

  const perMode = {};
  let baselineFindings = null;
  let baselineMode = null;

  for (const mode of REQUESTED_MODES) {
    process.stdout.write(`  ${mode.padEnd(8)}... `);
    const r = lintCorpusUnderMode(mode);
    if (r.error) {
      console.log(`error: ${r.error.slice(0, 80)}`);
      perMode[mode] = { error: r.error };
      continue;
    }
    perMode[mode] = {
      durationMs: r.durationMs,
      findingCount: r.findings.length,
      parserFailures: r.parserFailures,
      parsedFiles: r.parsedFiles,
      findings: r.findings,
    };
    console.log(`${r.durationMs.toFixed(0)}ms · ${r.findings.length} findings · ${r.parserFailures} parse-fail`);
    if (baselineFindings === null) {
      baselineFindings = r.findings;
      baselineMode = mode;
    }
  }

  // Drift analysis
  const driftPerMode: Record<string, any> = {};
  for (const [mode, data] of Object.entries(perMode) as Array<[string, any]>) {
    if (!data.findings || mode === baselineMode) continue;
    driftPerMode[mode] = diffFindings(baselineFindings, data.findings);
  }
  const totalDrift: number = (Object.values(driftPerMode) as any[]).reduce((s: number, d: any) => s + d.onlyInA.length + d.onlyInB.length, 0);

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Parser-Matrix',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: {
      ruleSurvivalRate: baselineFindings && baselineFindings.length > 0
        ? 1 - (totalDrift / Math.max(1, baselineFindings.length * (Object.keys(driftPerMode).length || 1)))
        : null,
    },
    latency: {
      meanLatencyMs: (Object.values(perMode) as any[]).reduce((s: number, d: any) => s + (d.durationMs ?? 0), 0) / Math.max(1, Object.keys(perMode).length),
    },
    perMode,
    driftPerMode,
    baselineMode,
    fallbackChain: ['js', 'js+jsx', 'ts', 'ts+jsx'],
    corpus: path.relative(REPO_ROOT, CORPUS),
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  console.log('');
  if (totalDrift === 0 && baselineMode) {
    console.log(`✅ ILB-Parser-Matrix PASS — zero drift across ${Object.keys(perMode).filter((m) => perMode[m].findings).length} parser mode(s)`);
  } else if (baselineMode) {
    console.log(`⚠️  drift across modes: ${totalDrift} entries`);
    for (const [mode, d] of Object.entries(driftPerMode) as Array<[string, any]>) {
      if (d.onlyInA.length || d.onlyInB.length) {
        console.log(`   ${baselineMode} vs ${mode}: +${d.onlyInB.length} −${d.onlyInA.length}`);
      }
    }
  }
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-Parser-Matrix fatal:', err);
  process.exit(2);
});
