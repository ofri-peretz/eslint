/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Record how long each workspace's test task actually takes.
 *
 * `ci-test-shard.mts` bin-packs by `countTestFiles`, and file count is a proxy
 * for duration that drifts: a package of 5 slow integration tests and one of 20
 * fast unit tests weigh 4:1 the wrong way. Measured on 2026-09-03 the lanes
 * came out 1.33x-1.83x apart, which is 175 runner-seconds of idle on a full run
 * — and because a lane finishes with its slowest shard, that idle is wall clock
 * too.
 *
 * This writes the real numbers so the bucketer can weigh by them. It runs the
 * SAME task the sharder would pick (`test`, or `test:coverage` when that is all
 * a package has), so the profile measures the thing being scheduled rather than
 * an approximation of it.
 *
 * Refresh on a cadence, not per-PR: durations move slowly, and a profile that
 * regenerates on every run would make the shard layout — and therefore every
 * cache key downstream of it — nondeterministic.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
/** Mirrors ci-test-shard.mts: the daily codecov job sets this, PR runs do not. */
const wantCoverage = process.env.CI_TEST_SHARD_COVERAGE === '1';
const OUT = path.join(ROOT, '.agent', 'test-duration-profile.json');

type Pkg = { name: string; dir: string; task: string };

function workspaces(): Pkg[] {
  const root = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  );
  const globs: string[] = root.workspaces ?? [];
  const out: Pkg[] = [];
  for (const g of globs) {
    const base = g.replace(/\/\*$/, '');
    const abs = path.join(ROOT, base);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      // Same precedence ci-test-shard.mts uses, and recorded PER TASK: with
      // CI_TEST_SHARD_COVERAGE=1 the sharder picks `test:coverage`, whose v8
      // instrumentation roughly doubles the run. One number for both tasks
      // would have the daily coverage job bin-packing coverage work with
      // non-coverage weights.
      const task =
        wantCoverage && pkg.scripts?.['test:coverage']
          ? 'test:coverage'
          : pkg.scripts?.test
            ? 'test'
            : pkg.scripts?.['test:coverage']
              ? 'test:coverage'
              : null;
      if (task && pkg.name)
        out.push({ name: pkg.name, dir: `${base}/${entry}`, task });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function time(pkg: Pkg): Promise<number> {
  const started = Date.now();
  return new Promise((resolve) => {
    const c = spawn('npm', ['run', '--silent', pkg.task, '-w', pkg.name], {
      cwd: ROOT,
      env: { ...process.env, CI: '1' },
    });
    c.stdout.on('data', () => {});
    c.stderr.on('data', () => {});
    // `close` fires on a NONZERO exit too. A failing package exits on its first
    // broken assertion, so recording that duration writes the time-to-failure
    // as if it were the time-to-run — and overwrites a good prior measurement
    // with it. Caught in review on #871, after it had already put a failing
    // package at the top of this profile.
    c.on('close', (code) => resolve(code === 0 ? Date.now() - started : -1));
    c.on('error', () => resolve(-1));
  });
}

const pkgs = workspaces();
console.log(
  `profiling ${pkgs.length} workspaces (serially — concurrent runs would time each other)\n`,
);

const durations: Record<string, number> = {};
for (const p of pkgs) {
  const ms = await time(p);
  if (ms < 0) {
    console.log(`  skip  ${p.name} (could not run)`);
    continue;
  }
  durations[p.name] = Math.round(ms / 1000);
  console.log(`  ${String(durations[p.name]).padStart(4)}s  ${p.name}`);
}

const existing = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf8'))
  : {};
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      // Recorded so a stale profile is visible rather than silently trusted.
      recordedAt: new Date().toISOString().slice(0, 10),
      // `artefacts-name-their-method.lock` requires this, and the reason it
      // gives is exactly right: absent, a typed number comes to read as a
      // measurement. These ARE measurements — this says how to take them again.
      command: 'npx tsx scripts/profile-test-durations.mts',
      note:
        'Seconds per workspace test task, measured serially. Consumed by ' +
        'scripts/ci-test-shard.mts as the bin-packing weight; packages absent ' +
        'here fall back to test-file count.',
      // Keyed by task: `durations` is the PR-shape (`test`) profile,
      // `durationsCoverage` the one the daily coverage job schedules against.
      // A single map would silently weigh one mode with the other's numbers.
      ...(wantCoverage
        ? {
            durations: existing.durations,
            durationsCoverage: { ...existing.durationsCoverage, ...durations },
          }
        : {
            durations: { ...existing.durations, ...durations },
            durationsCoverage: existing.durationsCoverage,
          }),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `\nwrote ${path.relative(ROOT, OUT)} (${Object.keys(durations).length} measured)`,
);
