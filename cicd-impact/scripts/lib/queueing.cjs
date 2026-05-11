// Queueing-theory helpers for the staging-bottleneck argument.
//
// Many CI/CD pipelines run a deploy job under `concurrency: deploy-${env}` with
// `cancel-in-progress: false` (a common GitHub Actions pattern). That makes the
// staging deploy a single-server queue: arrivals (PRs/pushes) compete for one
// resource (the deploy lock), and the wait time grows non-linearly with
// utilisation. The empirical signal lives in the gap between each deploy job's
// `created_at` and `started_at` — which is what `empiricalBlastRadius` below
// reads from.
//
// We model it as M/M/1 for the executive narrative because it's the cleanest
// "wait amplifies as utilisation rises" story. Real CI traffic is bursty
// (more pushes pre-lunch, fewer overnight) — which makes the *real* wait worse
// than M/M/1 predicts, not better. We call this out in methodology.md.

// Expected wait time in queue (W_q) for M/M/1, normalised against service time.
//   W_q / E[S]  =  rho / (1 - rho)
// rho = arrival_rate / service_rate = utilisation in [0, 1).
const mm1WaitMultiplier = (rho) => {
  if (rho < 0 || rho >= 1) {
    return Infinity; // saturated queue
  }
  return rho / (1 - rho);
};

// Total time in system normalised: (W_q + E[S]) / E[S] = 1 / (1 - rho)
const mm1TotalMultiplier = (rho) => {
  if (rho < 0 || rho >= 1) return Infinity;
  return 1 / (1 - rho);
};

// Estimate STG concurrency-lock utilisation from observed data.
//   total_deploy_seconds / window_seconds = busy fraction.
// This is a lower bound — real utilisation is higher because we're only
// counting *successful* runs. Use empirically as a sanity check.
const estimateUtilisation = (deployJobs, windowSeconds) => {
  if (!deployJobs || deployJobs.length === 0) return 0;
  let busy = 0;
  for (const job of deployJobs) {
    if (!job.started_at || !job.completed_at) continue;
    const s = new Date(job.started_at).getTime();
    const e = new Date(job.completed_at).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      busy += (e - s) / 1000;
    }
  }
  return Math.min(busy / windowSeconds, 0.999);
};

// Empirical blast-radius estimator: of the deploy-app jobs that waited on the
// concurrency lock (created_at -> started_at gap), how many were waiting
// behind a deploy that ultimately failed?
//
// Inputs: array of {run_id, name, conclusion, created_at, started_at} for
// deploy-app jobs only, joined to the parent run's conclusion.
//
// Returns: { wait_count, wait_behind_failure, ratio }
//   ratio = wait_behind_failure / wait_count, the empirical multiplier.
const empiricalBlastRadius = (deployJobs, runConclusionByRunId) => {
  let wait_count = 0;
  let wait_behind_failure = 0;
  for (const job of deployJobs) {
    if (!job.created_at || !job.started_at) continue;
    const queueSeconds = (new Date(job.started_at).getTime() - new Date(job.created_at).getTime()) / 1000;
    if (queueSeconds < 30) continue; // <30s queue is just GH scheduling, not concurrency lock
    wait_count += 1;
    const parentConclusion = runConclusionByRunId.get(job.run_id);
    if (parentConclusion === 'failure' || parentConclusion === 'timed_out') {
      wait_behind_failure += 1;
    }
  }
  const ratio = wait_count === 0 ? 1 : 1 + (wait_behind_failure / wait_count);
  return { wait_count, wait_behind_failure, ratio };
};

module.exports = {
  mm1WaitMultiplier,
  mm1TotalMultiplier,
  estimateUtilisation,
  empiricalBlastRadius,
};
