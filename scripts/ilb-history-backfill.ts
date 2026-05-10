#!/usr/bin/env -S npx tsx
/**
 * ilb-history-backfill — populate `benchmark-results/history.ndjson` from the
 * existing per-bench result JSON files (roadmap item 1.12).
 *
 * Idempotent: rebuilds the file from scratch each invocation, sorted by
 * timestamp. New runs append via `lib/history.mjs#appendHistory()` going
 * forward; this script exists to seed the timeline with what we already have.
 *
 * Usage:
 *   node scripts/ilb-history-backfill.mjs           # reads all results/*, writes history.ndjson
 *   node scripts/ilb-history-backfill.mjs --dry-run # preview rows without writing
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../benchmarks/lib/toolchain.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const RESULTS_ROOT = path.join(REPO_ROOT, 'benchmarks', 'results');
const HISTORY_PATH = path.join(REPO_ROOT, 'benchmark-results', 'history.ndjson');

const DRY_RUN = process.argv.includes('--dry-run');

const BENCH_FROM_DIRNAME = {
  'ilb-arena': 'ILB-Arena',
  'ilb-arena-quality': 'ILB-Arena-Quality',
  'ilb-juliet': 'ILB-Juliet',
  'ilb-wild': 'ILB-Wild',
  'ilb-edge': 'ILB-Edge',
  'ilb-cov': 'ILB-Cov',
  'ilb-perf': 'ILB-Perf',
  'ilb-perf-import-no-cycle': 'ILB-Perf',
  'ilb-ai': 'ILB-AI',
  'ilb-llm-tokens': 'ILB-LLM-Tokens',
  'ilb-llm-fix': 'ILB-LLM-Fix',
  'ilb-formatter': 'ILB-Formatter',
};

function findResultFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findResultFiles(p));
    else if (entry.name.endsWith('.json') && entry.name !== 'latest.json') out.push(p);
  }
  return out;
}

function inferBenchFromPath(filePath) {
  const rel = path.relative(RESULTS_ROOT, filePath);
  const dir = rel.split(path.sep)[0];
  return BENCH_FROM_DIRNAME[dir] ?? `unknown:${dir}`;
}

function pickNumeric(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function distillSummary(parsed) {
  const summary = {};
  // New-shape envelope (post-vocabulary-contract)
  Object.assign(summary, pickNumeric(parsed.cost));
  Object.assign(summary, pickNumeric(parsed.effectiveness));
  Object.assign(summary, pickNumeric(parsed.latency));
  // Legacy-shape: top-level numeric leaves; pull common ones if present
  for (const k of [
    'f1', 'precision', 'recall', 'tp', 'fp', 'fn', 'tn', 'rank',
    'msPerFile', 'meanLatencyMs', 'peakRssMb', 'tokensO200k',
    'passRate', 'vulnDetectionRate', 'activationRate', 'signalScore',
  ]) {
    if (typeof parsed[k] === 'number') summary[k] = parsed[k];
  }
  // Legacy ILB-Arena rolls up under summary.aggregate or similar
  if (parsed.summary && typeof parsed.summary === 'object') {
    for (const [k, v] of Object.entries(parsed.summary)) {
      if (typeof v === 'number' && summary[k] === undefined) summary[k] = v;
    }
  }
  return summary;
}

function buildRow(filePath, parsed) {
  return {
    bench: parsed.bench ?? inferBenchFromPath(filePath),
    benchVersion: parsed.benchVersion ?? parsed.version ?? 'unversioned',
    timestamp: parsed.timestamp ?? deriveTimestampFromFilename(filePath),
    toolchain: parsed.toolchain ?? deriveLegacyToolchain(parsed),
    methodologyCommit: parsed.methodologyCommit ?? null,
    summary: distillSummary(parsed),
    resultPath: path.relative(REPO_ROOT, filePath),
    superseded: false,
    backfilled: true,
  };
}

function deriveTimestampFromFilename(filePath) {
  const m = path.basename(filePath).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? `${m[1]}T00:00:00.000Z` : new Date().toISOString();
}

function deriveLegacyToolchain(parsed) {
  // Pre-vocabulary-contract envelope used `environment` block.
  const env = parsed.environment ?? {};
  return {
    node: (env.nodeVersion ?? '').replace(/^v/, '') || null,
    eslint: env.eslintVersion ?? null,
    typescript: env.typescriptVersion ?? null,
    tsCompiler: 'unknown',
    typescriptEslint: null,
    platform: env.platform && env.arch ? `${env.platform}-${env.arch}` : (env.platform ?? null),
    backfilledFromLegacy: true,
  };
}

function main() {
  const files = findResultFiles(RESULTS_ROOT);
  if (files.length === 0) {
    console.log('ilb-history-backfill: no result files found under benchmarks/results/');
    process.exit(0);
  }

  const rows = [];
  let skipped = 0;

  for (const file of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      rows.push(buildRow(file, parsed));
    } catch (err) {
      skipped++;
      process.stderr.write(`skip ${path.relative(REPO_ROOT, file)}: ${err.message}\n`);
    }
  }

  rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const lines = rows.map((r) => JSON.stringify(r));

  if (DRY_RUN) {
    console.log(`ilb-history-backfill --dry-run: would write ${rows.length} rows (${skipped} skipped) to ${path.relative(REPO_ROOT, HISTORY_PATH)}`);
    if (rows.length > 0) console.log('first row preview:', lines[0]);
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`ilb-history-backfill: wrote ${rows.length} rows (${skipped} skipped) to ${path.relative(REPO_ROOT, HISTORY_PATH)}`);

  // Add a minimal toolchain footer for traceability of the backfill itself.
  const meta = {
    backfillTimestamp: new Date().toISOString(),
    backfillToolchain: getToolchain(),
    rowCount: rows.length,
    skippedCount: skipped,
  };
  fs.writeFileSync(HISTORY_PATH + '.meta.json', JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

main();
