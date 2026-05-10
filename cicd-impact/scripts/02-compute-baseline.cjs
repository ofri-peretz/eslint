#!/usr/bin/env node
// Read data/runs-90d.json + data/jobs-90d.json, compute the *measurable*
// pipeline metrics (no executive inputs needed), write metrics.json.
//
// Outputs the symbols the unit-cost formula consumes:
//   T_dur     - mean pipeline wall-clock per run, in minutes
//   T_dur_p50 / p90 - percentiles (p90 is the realistic complaint case)
//   T_queue   - mean queue time per run (sum of all per-job queue waits)
//   R         - runs per business day
//   F         - CI failure rate (per inputs policy)
//   D         - distinct active developers in window
//   T_e2e     - mean e2e leg duration (only when triggered)
//   blast_radius_empirical - empirical multiplier from deploy-app concurrency waits
//   utilisation_estimate   - lower-bound STG utilisation
//
// Usage: ./02-compute-baseline.cjs [--data-dir path] [--out path]
const fs = require('node:fs');
const path = require('node:path');
const fmt = require('./lib/format.cjs');
const queueing = require('./lib/queueing.cjs');

const args = process.argv.slice(2);
const dataDir = (() => {
  const i = args.indexOf('--data-dir');
  return i >= 0 ? args[i + 1] : path.join(__dirname, '..', 'data');
})();
const outPath = (() => {
  const i = args.indexOf('--out');
  return i >= 0 ? args[i + 1] : path.join(dataDir, 'metrics.json');
})();

const runs = JSON.parse(fs.readFileSync(path.join(dataDir, 'runs-90d.json'), 'utf8'));
const jobs = JSON.parse(fs.readFileSync(path.join(dataDir, 'jobs-90d.json'), 'utf8'));

if (runs.length === 0) {
  console.error('No runs in data/runs-90d.json. Did you run 01-fetch-actions-data.sh?');
  process.exit(1);
}

// --- Window bounds -----------------------------------------------------------
const sortedTimes = runs.map((r) => new Date(r.created_at).getTime()).sort((a, b) => a - b);
const windowStart = sortedTimes[0];
const windowEnd = sortedTimes[sortedTimes.length - 1];
const windowDays = (windowEnd - windowStart) / (1000 * 60 * 60 * 24);
const windowSeconds = (windowEnd - windowStart) / 1000;
// Business days: weekdays only. Approximation: windowDays * 5/7.
const businessDays = Math.max(1, windowDays * (5 / 7));

// --- T_dur: pipeline wall-clock per *completed* run --------------------------
// run_started_at can be null for skipped/cancelled-before-start runs; fall
// back to created_at for those (zero-duration) so the array stays well-formed.
const runDurations = runs
  .filter((r) => r.status === 'completed')
  .map((r) => fmt.isoMinutesBetween(r.run_started_at || r.created_at, r.updated_at))
  .filter((d) => d != null && d > 0);

const T_dur_mean = fmt.mean(runDurations);
const T_dur_p50 = fmt.percentile(runDurations, 50);
const T_dur_p90 = fmt.percentile(runDurations, 90);
const T_dur_p99 = fmt.percentile(runDurations, 99);

// --- T_queue: per-run sum of per-job queue waits -----------------------------
// Job queue time = started_at - created_at. We sum across jobs *per run*, then
// average across runs. This double-counts parallel job queues, which we want:
// the question is "how much queue time did the build *contain*", not the
// critical path.
const jobsByRun = new Map();
for (const job of jobs) {
  if (!jobsByRun.has(job.run_id)) jobsByRun.set(job.run_id, []);
  jobsByRun.get(job.run_id).push(job);
}

const runQueueTimes = [];
for (const [, runJobs] of jobsByRun) {
  let queueMin = 0;
  for (const job of runJobs) {
    const q = fmt.isoMinutesBetween(job.created_at, job.started_at);
    if (q != null && q > 0) queueMin += q;
  }
  runQueueTimes.push(queueMin);
}
const T_queue_mean = fmt.mean(runQueueTimes) || 0;
const T_queue_p90 = fmt.percentile(runQueueTimes, 90) || 0;

// --- R: runs per business day ------------------------------------------------
// Only count runs that actually started executing (skip path-filtered or label-
// gated noops). Approximation: runs with run_started_at set.
const startedRuns = runs.filter((r) => r.run_started_at).length;
const R = startedRuns / businessDays;

// --- F: failure rate ---------------------------------------------------------
// Per the seeded inputs.yml policy: cancelled = not failure, timed_out = failure.
// We compute both raw and policy-adjusted so the report can show the contrast.
const completed = runs.filter((r) => r.status === 'completed');
const failed_strict = completed.filter((r) => r.conclusion === 'failure').length;
const failed_with_timeout = completed.filter(
  (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out',
).length;
const cancelled = completed.filter((r) => r.conclusion === 'cancelled').length;
const success = completed.filter((r) => r.conclusion === 'success').length;

const F_strict = completed.length === 0 ? 0 : failed_strict / completed.length;
const F_inclusive = completed.length === 0 ? 0 : failed_with_timeout / completed.length;
// The policy default in inputs.yml: cancelled excluded, timeouts included.
const F_policy = completed.length === 0
  ? 0
  : failed_with_timeout / Math.max(1, completed.length - cancelled);

// --- D: distinct active developers -------------------------------------------
const actors = new Set(runs.map((r) => r.actor).filter(Boolean));
const D_measured = actors.size;

// --- T_e2e: e2e leg duration -------------------------------------------------
// The e2e job is named "Trigger E2E tests" in ci-cd.yml. We measure its run-time
// when it actually executed (not when it was skipped). This is the *cost* of
// running E2E, additive to T_dur.
const e2eJobs = jobs.filter(
  (j) => /e2e/i.test(j.name) && j.status === 'completed' && j.conclusion !== 'skipped',
);
const e2eDurations = e2eJobs
  .map((j) => fmt.isoMinutesBetween(j.started_at, j.completed_at))
  .filter((d) => d != null && d > 0);
const T_e2e_mean = fmt.mean(e2eDurations) || 0;
const T_e2e_count = e2eDurations.length;

// --- Empirical blast radius: deploy-app jobs queueing behind failed runs -----
// The deploy-app job is rendered as "Deploy app" in the run's job list. The
// concurrency lock is what causes its created_at -> started_at gap.
const deployJobs = jobs.filter((j) => j.name === 'Deploy app' && j.status === 'completed');
const runConclusionByRunId = new Map(runs.map((r) => [r.id, r.conclusion]));
const blast = queueing.empiricalBlastRadius(deployJobs, runConclusionByRunId);

// --- STG utilisation lower bound ---------------------------------------------
const stgUtilisation = queueing.estimateUtilisation(
  deployJobs.filter((j) => j.conclusion === 'success'),
  windowSeconds,
);

// --- Detect long-tail / context-switch share ---------------------------------
// What fraction of runs cross the long-threshold (10 min in inputs.yml default)?
// This is what the cognitive-tax bucket actually weights.
const aboveLong = runDurations.filter((d) => d >= 10).length;
const aboveShort = runDurations.filter((d) => d >= 2).length;
const cognitive_share_long = runDurations.length === 0 ? 0 : aboveLong / runDurations.length;
const cognitive_share_medium = runDurations.length === 0
  ? 0
  : (aboveShort - aboveLong) / runDurations.length;

// --- Output ------------------------------------------------------------------
const metrics = {
  generated_at: new Date().toISOString(),
  window: {
    start: new Date(windowStart).toISOString(),
    end: new Date(windowEnd).toISOString(),
    days: Number(windowDays.toFixed(1)),
    business_days: Number(businessDays.toFixed(1)),
    runs_total: runs.length,
    runs_started: startedRuns,
    runs_completed: completed.length,
    jobs_total: jobs.length,
  },
  T_dur_minutes: {
    mean: T_dur_mean,
    p50: T_dur_p50,
    p90: T_dur_p90,
    p99: T_dur_p99,
    sample_size: runDurations.length,
  },
  T_queue_minutes: {
    mean: T_queue_mean,
    p90: T_queue_p90,
    note: 'Sum of per-job created_at→started_at across all jobs in a run; double-counts parallel queues by design.',
  },
  T_e2e_minutes: {
    mean: T_e2e_mean,
    sample_size: T_e2e_count,
    note: 'Only when E2E actually ran (deploy to stg + non-master ref). Additive to T_dur.',
  },
  R_runs_per_business_day: R,
  F_failure_rate: {
    strict: F_strict,
    inclusive_timeouts: F_inclusive,
    policy_adjusted: F_policy,
    counts: { success, failed_strict, failed_with_timeout, cancelled, total: completed.length },
  },
  D_distinct_actors: D_measured,
  blast_radius_empirical: {
    multiplier: blast.ratio,
    waits_observed: blast.wait_count,
    waits_behind_failure: blast.wait_behind_failure,
    note: 'A deploy-app job whose concurrency-lock wait was followed by a failed parent run = a developer blocked behind a broken STG. Multiplier = 1 + ratio.',
  },
  stg_utilisation_estimate: {
    value: stgUtilisation,
    method: 'M/M/1 lower bound — sum of successful deploy-app runtimes / window seconds',
    note: 'Real utilisation is higher (failed/cancelled deploys also held the lock).',
  },
  cognitive_share: {
    medium: cognitive_share_medium, // fraction of runs in the 2-10 min band
    long: cognitive_share_long,     // fraction of runs ≥ 10 min
    note: 'Used by 03-compute-unit-cost.cjs to weight the piecewise S(T_dur).',
  },
};

fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2));

console.log(`Wrote ${outPath}`);
console.log(`  Window:                ${metrics.window.days} days (${metrics.window.business_days} business days)`);
console.log(`  Runs:                  ${metrics.window.runs_total} (${metrics.window.runs_completed} completed)`);
console.log(`  T_dur (mean / p90):    ${fmt.minutes(T_dur_mean)} / ${fmt.minutes(T_dur_p90)}`);
console.log(`  T_queue (mean):        ${fmt.minutes(T_queue_mean)}`);
console.log(`  T_e2e (mean):          ${fmt.minutes(T_e2e_mean)} (n=${T_e2e_count})`);
console.log(`  R (runs/biz-day):      ${R.toFixed(1)}`);
console.log(`  F (policy):            ${fmt.percent(F_policy)}`);
console.log(`  D (distinct actors):   ${D_measured}`);
console.log(`  Blast radius (empir.): ${blast.ratio.toFixed(2)} (n=${blast.wait_count} waits, ${blast.wait_behind_failure} behind failure)`);
console.log(`  STG utilisation est.:  ${fmt.percent(stgUtilisation)}`);
