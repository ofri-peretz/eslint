#!/usr/bin/env -S npx tsx

/**
 * prune-benchmark-results — keep only the N most recent dated snapshots
 * per suite, delete older ones.
 *
 * Runs in the weekly benchmark job after new results are written, before
 * the commit step. Long-term history is curated in
 * `benchmark-results/history.ndjson` — raw results are not the canonical
 * record.
 *
 * N = 3: the weekly job runs every Monday; 3 snapshots = 3 weeks of raw
 * data for regression comparison. More than 3 is unnecessary bloat since
 * the curated history is the canonical record.
 *
 * Only files matching `^\d{4}-\d{2}-\d{2}` are pruned. Files like
 * `latest.json`, `baseline.json`, and subdirectories like `backups/` are
 * left untouched.
 *
 * Usage:
 *   tsx scripts/prune-benchmark-results.ts             # prune (default N=3)
 *   tsx scripts/prune-benchmark-results.ts --dry-run   # preview only
 *   tsx scripts/prune-benchmark-results.ts --keep=5    # custom N
 */

import { readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RESULTS_DIR = join(REPO_ROOT, 'benchmarks', 'results');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const keepArg = args.find((a) => a.startsWith('--keep='));
const KEEP = keepArg ? parseInt(keepArg.split('=')[1], 10) : 3;

const DATED = /^\d{4}-\d{2}-\d{2}/;

if (!existsSync(RESULTS_DIR)) {
  console.log('benchmarks/results/ does not exist — nothing to prune.');
  process.exit(0);
}

let deletedCount = 0;
let deletedBytes = 0;

for (const suite of readdirSync(RESULTS_DIR, { withFileTypes: true })) {
  if (!suite.isDirectory()) continue;

  const suiteDir = join(RESULTS_DIR, suite.name);
  const dated = readdirSync(suiteDir)
    .filter((name) => DATED.test(name) && name.endsWith('.json'))
    .sort()
    .reverse(); // newest first

  if (dated.length <= KEEP) continue;

  const toDelete = dated.slice(KEEP);
  console.log(
    `\n${suite.name}: ${dated.length} dated files, keeping ${KEEP}, pruning ${toDelete.length}`,
  );

  for (const file of toDelete) {
    const filePath = join(suiteDir, file);
    const size = statSync(filePath).size;
    if (DRY_RUN) {
      console.log(`  [dry-run] would delete ${file} (${(size / 1024).toFixed(0)} KB)`);
    } else {
      unlinkSync(filePath);
      console.log(`  deleted ${file} (${(size / 1024).toFixed(0)} KB)`);
    }
    deletedCount++;
    deletedBytes += size;
  }
}

const prefix = DRY_RUN ? '[dry-run] ' : '';
console.log(
  `\n${prefix}Pruned ${deletedCount} files, ${(deletedBytes / (1024 * 1024)).toFixed(1)} MiB freed.`,
);
