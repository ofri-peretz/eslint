#!/usr/bin/env -S npx tsx

/**
 * check-benchmark-results-size — fail if `benchmarks/results/` grows past
 * a fixed threshold.
 *
 * This is the lock test that would have caught the 51 MB file
 * (`ilb-flagship/2026-05-11.json`) that landed in May 2026 and pushed the
 * directory to 66 MB. It runs in the `quality` composite on every PR and
 * as a dedicated job in `quality.yml`.
 *
 * Threshold: 20 MiB.
 *   - Post-cleanup size: ~15 MiB → passes (5 MiB headroom).
 *   - Pre-cleanup size:  66 MiB → fails (the 51 MB file alone exceeds 20 MiB
 *     by 2.5×).
 *   - The headroom catches any single file larger than ~5 MiB — the class
 *     of file that caused the original bloat.
 *
 * The threshold is deliberately NOT configurable via CLI or env. A
 * configurable cap is a cap someone raises to make the gate pass, which
 * defeats the point. Change it here, in source, with a commit that says why.
 */

import { statSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RESULTS_DIR = join(REPO_ROOT, 'benchmarks', 'results');

/** 20 MiB — see header for justification. */
const THRESHOLD_BYTES = 20 * 1024 * 1024;

function dirSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(fullPath);
    } else if (entry.isFile()) {
      total += statSync(fullPath).size;
    }
  }
  return total;
}

const sizeBytes = dirSize(RESULTS_DIR);
const sizeMiB = (sizeBytes / (1024 * 1024)).toFixed(1);
const thresholdMiB = (THRESHOLD_BYTES / (1024 * 1024)).toFixed(0);

if (sizeBytes > THRESHOLD_BYTES) {
  console.error(
    `❌ benchmarks/results/ is ${sizeMiB} MiB — exceeds ${thresholdMiB} MiB threshold.`,
  );
  console.error(
    '   Find the largest files: du -mh benchmarks/results/ | sort -rh | head -20',
  );
  process.exit(1);
}

console.log(
  `✅ benchmarks/results/ is ${sizeMiB} MiB — under ${thresholdMiB} MiB threshold.`,
);
