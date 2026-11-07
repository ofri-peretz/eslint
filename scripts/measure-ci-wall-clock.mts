/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * measure-ci-wall-clock — CI speed as a scheduled measurement, not a gate.
 *
 * `ci-speed` and `concurrency-budget` each set a wall-clock target (≤120s for
 * the PR fast loop, ≤60s and ≤12 jobs for Quality (Full) on main). Every lever
 * they shipped moved the number, and the number then drifted back, because
 * nothing measured it after the PR that moved it. Per ADR 0011 a number to
 * reach is a scheduled measurement: this records it weekly, and
 * `scripts/control-bands.ts` watches it like any other metric.
 *
 * One file per ISO week under `benchmarks/results/ci-wall-clock/`, named by
 * the week's Monday so the control-band collector reads it as a dated run:
 *
 *   quality.prMedianSeconds       median wall-clock of successful `quality.yml`
 *                                 pull_request runs (ci-speed, ≤120s)
 *   qualityFull.pushMedianSeconds median wall-clock of successful
 *                                 `quality-full.yml` push runs on main
 *                                 (concurrency-budget C1, ≤60s)
 *   qualityFull.pushMedianJobs    median job count of those runs (C2, ≤12)
 *   qualityFull.prMedianSeconds   the same gate on pull requests (C4)
 *
 * Wall-clock is `run_started_at` → `updated_at` of the run: what a person
 * waits for, queueing included, which is how both intents measured it.
 *
 * Usage:
 *   tsx scripts/measure-ci-wall-clock.mts               # the last complete week
 *   tsx scripts/measure-ci-wall-clock.mts --weeks 12    # backfill (Actions keeps ~90 days)
 *   tsx scripts/measure-ci-wall-clock.mts --dry-run     # print, write nothing
 *
 * Needs `gh` authenticated (GH_TOKEN in CI, `actions: read`).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { captureMethodology } from '../benchmarks/lib/methodology.ts';
import { getToolchain } from '../benchmarks/lib/toolchain.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'benchmarks', 'results', 'ci-wall-clock');
const REPO = process.env.GITHUB_REPOSITORY ?? 'ofri-peretz/eslint';

interface Run {
  id: number;
  event: string;
  head_branch: string;
  conclusion: string | null;
  run_started_at: string;
  updated_at: string;
}

export interface WeekReading {
  week: string;
  quality: { prRuns: number; prMedianSeconds: number | null };
  qualityFull: {
    pushRuns: number;
    pushMedianSeconds: number | null;
    pushMedianJobs: number | null;
    prRuns: number;
    prMedianSeconds: number | null;
  };
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function wallSeconds(
  run: Pick<Run, 'run_started_at' | 'updated_at'>,
): number {
  return Math.round(
    (Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 1000,
  );
}

/** Monday 00:00 UTC of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const m = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return m;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function gh(args: string[]): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runs(workflow: string, from: Date, to: Date): Run[] {
  const created = `${iso(from)}..${iso(new Date(to.getTime() - 86_400_000))}`;
  const out = gh([
    'api',
    '--paginate',
    `repos/${REPO}/actions/workflows/${workflow}/runs?status=success&created=${created}&per_page=100`,
    '--jq',
    '.workflow_runs[] | {id, event, head_branch, conclusion, run_started_at, updated_at}',
  ]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Run);
}

function jobCount(runId: number): number {
  return Number(
    gh([
      'api',
      `repos/${REPO}/actions/runs/${runId}/jobs?per_page=1`,
      '--jq',
      '.total_count',
    ]).trim(),
  );
}

export function readWeek(monday: Date): WeekReading {
  const next = new Date(monday.getTime() + 7 * 86_400_000);
  const quick = runs('quality.yml', monday, next).filter(
    (r) => r.event === 'pull_request',
  );
  const full = runs('quality-full.yml', monday, next);
  const push = full.filter(
    (r) => r.event === 'push' && r.head_branch === 'main',
  );
  const pr = full.filter((r) => r.event === 'pull_request');
  // Job counts cost one call per run; a week's push runs are tens, not thousands.
  const jobs = push.map((r) => jobCount(r.id));
  return {
    week: iso(monday),
    quality: {
      prRuns: quick.length,
      prMedianSeconds: median(quick.map(wallSeconds)),
    },
    qualityFull: {
      pushRuns: push.length,
      pushMedianSeconds: median(push.map(wallSeconds)),
      pushMedianJobs: median(jobs),
      prRuns: pr.length,
      prMedianSeconds: median(pr.map(wallSeconds)),
    },
  };
}

function main(): void {
  const argv = process.argv.slice(2);
  const weeksArg = argv.indexOf('--weeks');
  const weeks = weeksArg === -1 ? 1 : Number(argv[weeksArg + 1]);
  const dry = argv.includes('--dry-run');
  if (!Number.isInteger(weeks) || weeks < 1)
    throw new Error('--weeks takes a positive integer');

  // The last COMPLETE week: a partial week would read low on Monday morning.
  const thisMonday = mondayOf(new Date());
  for (let i = weeks; i >= 1; i--) {
    const monday = new Date(thisMonday.getTime() - i * 7 * 86_400_000);
    const reading = readWeek(monday);
    const line = JSON.stringify(reading);
    if (dry) {
      console.log(line);
      continue;
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, `${reading.week}.json`);
    // The benchmark-results vocabulary contract (scripts/ilb-validate-results.ts),
    // so the control-band collector can read this beside every other suite.
    const envelope = {
      bench: 'CI-Wall-Clock',
      benchVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      toolchain: getToolchain(),
      ...captureMethodology(import.meta.url),
      ...reading,
    };
    fs.writeFileSync(file, `${JSON.stringify(envelope, null, 2)}\n`);
    console.log(`${path.relative(ROOT, file)}  ${line}`);
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
  main();
