/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Run independent npm scripts concurrently inside ONE job.
 *
 * GitHub Free allows 20 concurrent jobs and this repo's PR gate wants 45, so
 * jobs queue: measured 2026-09-03 at p50 25s, p90 69s, max 87s, with one PR
 * seeing its last check start 346 seconds after its first. Wall clock is
 * dominated by waiting for a slot, not by the checks — the whole gate's actual
 * compute is 80-100s.
 *
 * A slot is therefore the scarce resource, and seven small checks holding seven
 * of them is the expensive part: each also re-pays ~13s of setup, which is 41%
 * of all step time across the repo.
 *
 * Running them sequentially in one job would be worse (~336s summed). This runs
 * them concurrently, so the job costs about as long as its slowest member while
 * occupying one slot instead of seven.
 *
 * Output is buffered per command and printed in blocks, because interleaved
 * concurrent output is unreadable and the point of this is to keep failures
 * diagnosable.
 */

import { spawn } from 'node:child_process';

type Result = {
  name: string;
  code: number;
  ms: number;
  out: string;
};

function run(script: string): Promise<Result> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', '--silent', script], {
      shell: false,
      env: process.env,
    });
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (out += c));
    child.on('close', (code) =>
      resolve({ name: script, code: code ?? 1, ms: Date.now() - started, out }),
    );
    child.on('error', (e) =>
      resolve({
        name: script,
        code: 1,
        ms: Date.now() - started,
        out: String(e),
      }),
    );
  });
}

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
  console.error('usage: run-parallel-checks.mts <npm-script>...');
  process.exit(2);
}

const results = await Promise.all(scripts.map(run));
const failed = results.filter((r) => r.code !== 0);

// Failures first and in full: on a red run this is the only thing anyone reads.
for (const r of failed) {
  console.log(
    `\n${'='.repeat(70)}\nFAILED  ${r.name}  (exit ${r.code}, ${(r.ms / 1000).toFixed(1)}s)\n${'='.repeat(70)}`,
  );
  console.log(r.out.trimEnd());
}

console.log(`\n${'-'.repeat(52)}`);
for (const r of [...results].sort((a, b) => b.ms - a.ms)) {
  console.log(
    `  ${r.code === 0 ? 'ok  ' : 'FAIL'}  ${(r.ms / 1000).toFixed(1).padStart(6)}s  ${r.name}`,
  );
}
const wall = Math.max(...results.map((r) => r.ms));
const summed = results.reduce((n, r) => n + r.ms, 0);
console.log(
  `${'-'.repeat(52)}\n  ${results.length} checks in ${(wall / 1000).toFixed(1)}s ` +
    `(${(summed / 1000).toFixed(1)}s if run one after another)`,
);

if (failed.length > 0) {
  console.log(
    `\n${failed.length} check(s) failed: ${failed.map((f) => f.name).join(', ')}`,
  );
  process.exit(1);
}
