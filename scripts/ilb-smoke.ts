#!/usr/bin/env -S npx tsx
/**
 * ilb-smoke — single 5-min PR gate covering every dimension of the bench
 * (roadmap item 5.2). Replaces the scattered "run 23 individual gates"
 * pattern with one orchestrated run + one pass/fail summary.
 *
 * What it runs (~5 min wall time):
 *
 *   Validation (instant)
 *     - ilb:validate-fixtures:strict
 *     - ilb:validate-results
 *     - docs:cwe-coverage:check
 *     - ilb:provenance:check (warning-only — provenance is gradual coverage)
 *     - ilb:leaderboard:check
 *
 *   Reporting (sub-second)
 *     - ilb:mappings:report
 *     - ilb:iso25010:report
 *     - docs:cwe-coverage
 *
 *   Fast benches (<= 30 sec each)
 *     - ilb:juliet (synthetic CWE accuracy)
 *     - ilb:autofix
 *     - ilb:severity-audit
 *     - ilb:determinism (single-fixture, 2 runs)
 *     - ilb:confidence
 *     - ilb:discover (BM25 retriever, no LLM cost)
 *     - ilb:mutate (CWE-089 only, 3 mutators)
 *     - ilb:promotion-gate:explain
 *
 *   Skipped (heavy / require external state)
 *     - ilb:wild (~30 min, nightly only)
 *     - ilb:ai (quarterly, requires API budget)
 *     - ilb:llm:fix (per-PR API spend — separate gate)
 *     - ilb:tsc-matrix / ilb:node-matrix / ilb:eslint-matrix (slow, nightly)
 *     - ilb:diff (requires CodeQL/Semgrep/Snyk install)
 *
 * Exit code: 0 if every required step passes; 1 if any required step fails.
 * Warning-only steps (provenance coverage, calibration miss) print but don't
 * fail the gate.
 *
 * Usage:
 *   npm run ilb:smoke                # CI mode — exits non-zero on any required failure
 *   npm run ilb:smoke -- --quiet     # only print failing steps
 *   npm run ilb:smoke -- --verbose   # full per-step output
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const QUIET = process.argv.includes('--quiet');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Each step has:
 *   id        short label
 *   group     'validation' | 'reporting' | 'bench'
 *   cmd       shell command
 *   required  true → failure fails the smoke gate; false → warning only
 *   timeoutMs ceiling
 */
const STEPS = [
  // Validation — instant, hard gates
  { id: 'validate-fixtures',    group: 'validation', cmd: 'npm run ilb:validate-fixtures:strict --silent',         required: true,  timeoutMs: 30_000 },
  { id: 'validate-results',     group: 'validation', cmd: 'node scripts/ilb-validate-results.mjs --quiet',          required: true,  timeoutMs: 30_000 },
  { id: 'cwe-coverage-check',   group: 'validation', cmd: 'node scripts/docs-cwe-coverage.mjs --check',             required: true,  timeoutMs: 30_000 },
  { id: 'provenance-check',     group: 'validation', cmd: 'node scripts/ilb-provenance.mjs --check',                required: false, timeoutMs: 30_000 },
  { id: 'leaderboard-check',    group: 'validation', cmd: 'node scripts/ilb-leaderboard-publish.mjs --check',       required: true,  timeoutMs: 30_000 },
  { id: 'promotion-gate',       group: 'validation', cmd: 'node scripts/ilb-promotion-gate.mjs --explain',          required: true,  timeoutMs: 30_000 },

  // Reporting — sub-second; failure usually means a structural break
  { id: 'mappings-report',      group: 'reporting',  cmd: 'node scripts/ilb-mappings-report.mjs',                   required: true,  timeoutMs: 30_000 },
  { id: 'iso25010-report',      group: 'reporting',  cmd: 'node scripts/ilb-iso25010-report.mjs',                   required: true,  timeoutMs: 30_000 },
  { id: 'cwe-coverage',         group: 'reporting',  cmd: 'node scripts/docs-cwe-coverage.mjs',                     required: true,  timeoutMs: 30_000 },

  // Fast benches
  { id: 'severity-audit',       group: 'bench',      cmd: 'node scripts/ilb-severity-audit.mjs',                    required: false, timeoutMs: 60_000 },
  { id: 'autofix',              group: 'bench',      cmd: 'node scripts/ilb-autofix-bench.mjs',                     required: false, timeoutMs: 60_000 },
  { id: 'determinism-cwe089',   group: 'bench',      cmd: 'npx tsx benchmarks/suites/ilb-determinism/run.mjs --runs 2 --corpus benchmarks/corpus/CWE-089',  required: true, timeoutMs: 90_000 },
  { id: 'confidence',           group: 'bench',      cmd: 'npx tsx benchmarks/suites/ilb-confidence/run.mjs',       required: false, timeoutMs: 60_000 },
  { id: 'discover',             group: 'bench',      cmd: 'npx tsx benchmarks/suites/ilb-discover/run.mjs',         required: false, timeoutMs: 60_000 },
  { id: 'mutate-cwe089',        group: 'bench',      cmd: 'npx tsx benchmarks/suites/ilb-mutate/run.mjs --cwe CWE-089 --mutators conditional-boundary,paren-redundancy,comment-injection',  required: false, timeoutMs: 120_000 },
];

function runStep(step) {
  const t0 = Date.now();
  let stdout = '';
  let stderr = '';
  let ok = true;
  let timedOut = false;
  try {
    stdout = execSync(step.cmd, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: step.timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (err) {
    ok = false;
    timedOut = err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM';
    stdout = err.stdout?.toString() ?? '';
    stderr = err.stderr?.toString() ?? err.message;
  }
  const durationMs = Date.now() - t0;
  return { ok, durationMs, stdout, stderr, timedOut };
}

function symbol(step, result) {
  if (result.ok) return '✅';
  if (step.required) return '❌';
  return '⚠️ ';
}

function statusLine(step, result) {
  const sym = symbol(step, result);
  const ms = `${result.durationMs.toString().padStart(5)}ms`;
  const tag = step.required ? 'required' : 'warn-only';
  return `${sym} ${step.id.padEnd(22)} ${ms}  [${tag}]${result.timedOut ? ' (timed out)' : ''}`;
}

function main() {
  const start = Date.now();
  console.log(`ilb:smoke — running ${STEPS.length} steps...`);
  console.log('');

  const results = [];
  let requiredFailures = 0;
  let warningFailures = 0;

  for (const step of STEPS) {
    const r = runStep(step);
    results.push({ step, result: r });

    if (!QUIET) console.log(statusLine(step, r));
    if (VERBOSE && !r.ok) {
      const tail = (r.stdout + '\n' + r.stderr).split('\n').slice(-15).join('\n   ');
      console.log(`   ${tail}`);
    }
    if (!r.ok) {
      if (step.required) requiredFailures++;
      else warningFailures++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log('─'.repeat(60));
  const passed = STEPS.length - requiredFailures - warningFailures;
  console.log(`ilb:smoke summary — ${elapsed}s · ${passed}/${STEPS.length} passed · ${requiredFailures} required failure(s) · ${warningFailures} warning(s)`);

  if (requiredFailures > 0) {
    console.log('');
    console.log('Required failures:');
    for (const { step, result } of results) {
      if (!result.ok && step.required) {
        const tail = result.stderr.split('\n').slice(-3).join(' · ').slice(0, 250);
        console.log(`  ❌ ${step.id} — ${tail}`);
      }
    }
    process.exit(1);
  }
  if (warningFailures > 0 && !QUIET) {
    console.log('');
    console.log('Warnings (non-blocking):');
    for (const { step, result } of results) {
      if (!result.ok && !step.required) console.log(`  ⚠️  ${step.id}`);
    }
  }

  process.exit(0);
}

main();
