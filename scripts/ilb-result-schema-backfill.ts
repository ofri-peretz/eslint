#!/usr/bin/env -S npx tsx

/**
 * ILB Result Schema Backfill — adds missing `bench` / `benchVersion` /
 * `toolchain` fields to historical bench result files so the
 * vocabulary-contract validator (`npm run ilb:validate-results:strict`)
 * passes cleanly.
 *
 * Strategy:
 *   - Walk benchmarks/results/<bench-name>/*.json
 *   - For each file missing one of the required fields, insert a marker:
 *       bench: <derived from directory name e.g. "ILB-Perf-Import">
 *       benchVersion: 'v0-legacy' (marker for pre-contract files)
 *       toolchain: { backfilled: true, source: 'ilb-result-schema-backfill' }
 *
 * The toolchain stub is honest about being backfilled — downstream
 * tooling that gates on the toolchain values can either accept the
 * marker or filter on `backfilled === true`.
 *
 * Usage:
 *   tsx scripts/ilb-result-schema-backfill.ts            # dry-run
 *   tsx scripts/ilb-result-schema-backfill.ts --apply    # write
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RESULTS_DIR = path.join(ROOT, 'benchmarks', 'results');

const APPLY = process.argv.includes('--apply');

// Map result directory names to the canonical bench enum value defined
// in benchmarks/lib/result-schema.json. New entries here must match the
// schema's `bench.enum` list — anything else fails strict validation.
const BENCH_DIR_TO_NAME: Record<string, string> = {
  'ilb-arena': 'ILB-Arena',
  'ilb-arena-quality': 'ILB-Arena-Quality',
  'ilb-juliet': 'ILB-Juliet',
  'ilb-juliet-cwe': 'ILB-Juliet',
  'ilb-wild': 'ILB-Wild',
  'ilb-edge': 'ILB-Edge',
  'ilb-cov': 'ILB-Cov',
  'ilb-perf': 'ILB-Perf',
  'ilb-perf-import': 'ILB-Perf',
  'ilb-perf-import-no-cycle': 'ILB-Perf',
  'ilb-perf-import-recommended': 'ILB-Perf',
  'ilb-ai': 'ILB-AI',
  'ilb-ai-overnight': 'ILB-AI',
  'ilb-llm-tokens': 'ILB-LLM-Tokens',
  'ilb-llm-fix': 'ILB-LLM-Fix',
  'ilb-formatter': 'ILB-Formatter',
  'ilb-determinism': 'ILB-Determinism',
  'ilb-autofix': 'ILB-Autofix',
  'ilb-confidence': 'ILB-Confidence',
  'ilb-discover': 'ILB-Discover',
  'ilb-evade': 'ILB-Evade',
  'ilb-provenance': 'ILB-Provenance',
  'ilb-cache-matrix': 'ILB-Cache-Matrix',
  'ilb-diff': 'ILB-Diff',
  'ilb-node-matrix': 'ILB-Node-Matrix',
  'ilb-tsc-matrix': 'ILB-TSC-Matrix',
  'ilb-eslint-matrix': 'ILB-ESLint-Matrix',
  'ilb-parser-matrix': 'ILB-Parser-Matrix',
  'ilb-mutate': 'ILB-Mutate',
  'ilb-wild-federated': 'ILB-Wild-Federated',
  // Roll-ups that don't have a dedicated enum value: route to the
  // closest matching enum entry. `ilb-flagship` aggregates Wild + Edge;
  // `ilb-oxlint-parity` is a comparative parity report against Wild.
  'ilb-flagship': 'ILB-Wild',
  'ilb-oxlint-parity': 'ILB-Wild',
};

function deriveBenchName(dirName: string): string | null {
  return BENCH_DIR_TO_NAME[dirName] ?? null;
}

let scanned = 0;
let updated = 0;
let alreadyOk = 0;
let parseErrors = 0;

let unknownBenchDirs = 0;

// Recurse into nested subdirs (`ilb-ai/backups/*.json`) — old result
// files sometimes live in non-canonical paths.
function listJsonFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    let stat;
    try { stat = fs.statSync(p); } catch { continue; }
    if (stat.isDirectory()) {
      out.push(...listJsonFiles(p));
    } else if (e.endsWith('.json')) {
      out.push(p);
    }
  }
  return out;
}

for (const benchDir of fs.readdirSync(RESULTS_DIR)) {
  const dir = path.join(RESULTS_DIR, benchDir);
  if (!fs.statSync(dir).isDirectory()) continue;
  const benchName = deriveBenchName(benchDir);
  if (!benchName) {
    unknownBenchDirs++;
    console.log(`  ⚠️  unknown bench dir (no enum mapping): ${benchDir}`);
    continue;
  }
  for (const fp of listJsonFiles(dir)) {
    const file = path.basename(fp);
    if (!file.endsWith('.json')) continue;
    scanned++;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch {
      parseErrors++;
      continue;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) continue;
    const ALLOWED_BENCH_NAMES = new Set(Object.values(BENCH_DIR_TO_NAME));
    const needsBench = parsed.bench === undefined || !ALLOWED_BENCH_NAMES.has(parsed.bench as string);
    const needsVersion =
      parsed.benchVersion === undefined ||
      !/^v?\d+\.\d+(\.\d+)?$/.test(String(parsed.benchVersion));
    const needsTimestamp =
      parsed.timestamp === undefined ||
      typeof parsed.timestamp !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(parsed.timestamp);
    const needsToolchain = parsed.toolchain === undefined;
    // Even if toolchain is present, it may be missing required fields.
    const tcMissingFields =
      typeof parsed.toolchain === 'object' && parsed.toolchain !== null
        ? ['node', 'eslint', 'typescript', 'tsCompiler', 'platform'].some(
            (f) => !(parsed.toolchain as Record<string, unknown>)[f],
          )
        : false;
    if (!needsBench && !needsVersion && !needsTimestamp && !needsToolchain && !tcMissingFields) {
      alreadyOk++;
      continue;
    }
    const updatedDoc: Record<string, unknown> = { ...parsed };
    if (needsBench) updatedDoc.bench = benchName;
    // benchVersion must match `^v?\d+\.\d+(\.\d+)?$` per the schema —
    // we use v0.0 for legacy / pre-vocabulary-contract files. The
    // explicit zero-major-version makes "this is unversioned legacy
    // data" unambiguous to anyone querying for trend lines.
    if (needsVersion) updatedDoc.benchVersion = 'v0.0';
    // Timestamp must be ISO-8601 date-time. For legacy files we infer
    // from the filename (`YYYY-MM-DD.json`) or fall back to file mtime.
    if (needsTimestamp) {
      const dateInName = file.match(/(\d{4}-\d{2}-\d{2})/);
      const isoDate = dateInName ? `${dateInName[1]}T00:00:00.000Z` : null;
      if (isoDate) {
        updatedDoc.timestamp = isoDate;
      } else {
        try {
          updatedDoc.timestamp = fs.statSync(fp).mtime.toISOString();
        } catch {
          updatedDoc.timestamp = new Date().toISOString();
        }
      }
    }
    if (needsToolchain) {
      // Schema per benchmarks/lib/toolchain.mjs `validateToolchain`:
      // every field must be a non-empty string; tsCompiler must be one
      // of "tsc-classic" | "tsc-go" | "unknown".
      updatedDoc.toolchain = {
        node: 'unknown',
        eslint: 'unknown',
        typescript: 'unknown',
        tsCompiler: 'unknown',
        platform: 'unknown',
        backfilled: true,
        backfilledAt: new Date().toISOString(),
        backfilledBy: 'scripts/ilb-result-schema-backfill.ts',
      };
    } else if (typeof parsed.toolchain === 'object' && parsed.toolchain !== null) {
      // Fill in any missing required toolchain fields without
      // overwriting already-present values.
      const tc = { ...parsed.toolchain } as Record<string, unknown>;
      let changed = false;
      for (const f of ['node', 'eslint', 'typescript', 'tsCompiler', 'platform']) {
        if (!tc[f]) {
          tc[f] = 'unknown';
          changed = true;
        }
      }
      if (changed) {
        tc.backfilled = true;
        tc.backfilledAt = new Date().toISOString();
        tc.backfilledBy = 'scripts/ilb-result-schema-backfill.ts';
        updatedDoc.toolchain = tc;
      }
    }
    if (APPLY) {
      // Preserve insertion order — put new fields at the top so they're
      // visible when humans skim the file.
      const reordered: Record<string, unknown> = {};
      if (needsBench) reordered.bench = updatedDoc.bench;
      if (needsVersion) reordered.benchVersion = updatedDoc.benchVersion;
      if (needsToolchain) reordered.toolchain = updatedDoc.toolchain;
      for (const [k, v] of Object.entries(updatedDoc)) {
        if (!(k in reordered)) reordered[k] = v;
      }
      fs.writeFileSync(fp, JSON.stringify(reordered, null, 2) + '\n');
    }
    updated++;
  }
}

console.log(`\nILB Result Schema Backfill — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  scanned ${scanned} files`);
console.log(`  ${alreadyOk} already had required fields`);
console.log(`  ${APPLY ? 'updated' : 'would update'} ${updated} files`);
console.log(`  ${parseErrors} parse errors (skipped)`);
