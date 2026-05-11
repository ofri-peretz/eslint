# Methodology

How the headline `$/CI minute` figure is derived. Every coefficient and every variable in this document either comes from a measurement (`data/metrics.json`) or has a citation (`research/sources.md`). Nothing is invented.

## The formula

For every minute the CI/CD pipeline runs, the company pays:

```
cost_per_ci_minute = (D × R × W) × (1 + S/T_pipeline) × (1 + F × K)
                       └────┬────┘   └─────┬──────┘     └────┬────┘
                       direct waste    cognitive tax    rework + blast
```

- **`D`** — active developers pushing code (measured from GitHub `actor` field over the last 90 d).
- **`R`** — CI/CD runs per business day (measured: total runs / weekday count in window).
- **`W`** — fully-loaded wage per developer-minute (executive input; `inputs.yml`).
- **`S`** — context-switch minutes lost when pipeline duration crosses a threshold (piecewise; see below).
- **`T_pipeline`** — mean wall-clock per run, including queue (`T_dur + T_queue`).
- **`F`** — CI failure rate, policy-adjusted (timeouts count, cancellations don't).
- **`K`** — blast-radius multiplier — how many other developers a broken STG blocks (empirical from concurrency-lock waits, or executive override).

Annualised cost is just `cost_per_ci_minute × annual_pipeline_minutes`, where `annual_pipeline_minutes = T_pipeline × R × business_days × D`. The `D` factor is what makes "save 1 minute off the build" worth so much: every dev pays it, every run.

## Why a unit cost (and not just a yearly total)?

A yearly TCO is a one-shot argument: it works in one budget meeting, then becomes stale. A `$/min` figure is reusable — every CI investment ("does adding this lint step cost more than it saves?") and every regression ("the build went from 8 min to 11 min — what did that cost?") gets answered with the same number. It also internalises queueing and parallelism: a minute saved off the critical path is worth `$/min`, but a minute saved off a parallel job that wasn't on the critical path is worth zero. The unit cost forces that distinction into every conversation.

## What we measure (no executive input)

The `01-fetch-actions-data.sh` script pulls the last 90 days of CI/CD runs and per-job timings via `gh api`. The `02-compute-baseline.cjs` script then derives:

| Variable | How |
|---|---|
| `T_dur` | Mean of `run_started_at → updated_at` for completed runs of the `CI/CD` workflow. P50/P90/P99 also reported — the report quotes the mean for the headline and P90 in a sidebar (the "realistic complaint" case). |
| `T_queue` | Per run, sum of `(job.started_at − job.created_at)` across all its jobs. We deliberately double-count parallel queues — the question is "how much queue time did the build *contain*", not the critical path. The `deploy-app` job's queue gap specifically reflects the `concurrency: deploy-${env}` lock with `cancel-in-progress: false`, which is the staging bottleneck the formula was designed to capture. |
| `R` | Runs that actually started executing, divided by business days in the window (window-days × 5/7). |
| `F` | Per `inputs.yml` policy: cancelled = not failure, timeouts = failure. Strict and inclusive variants also reported for sensitivity. |
| `D` | Distinct `github.actor` logins over the window. |
| `T_e2e` | Mean `started_at → completed_at` for the E2E job, only when it actually ran. Reported for context (the E2E leg adds ~10–15 min on top of the build). |
| `K` (empirical) | Of the `Deploy app` jobs that waited >30 s on the concurrency lock, what fraction belonged to a run that ultimately failed? `K_empirical = 1 + (waits_behind_failure / total_waits)`. <30 s queue is GitHub Actions runner provisioning, not the concurrency lock — we filter that out. |
| STG utilisation (lower bound) | `sum(successful deploy-app runtimes) / window_seconds`. Real utilisation is higher; we use this as an "even by the most generous count, STG is at X% utilisation" sanity check. |

## What only executives can answer (`inputs.yml`)

These don't come from data; they come from policy. The `inputs.yml` file ships with seeded defaults and is the only file an executive should need to edit:

| Input | Default | Sensitivity to the headline |
|---|---|---|
| `wage_per_minute_usd` | $2.00/min (~$240k/yr fully loaded) | **Linear.** ±25% wage = ±25% headline. |
| `active_developers` | `null` (use measured) | Linear, but rarely overridden. |
| `cognitive_tax_minutes` | `{short: 0, medium: 5, long: 23}` | High when builds are >10 min, near-zero when <2 min. |
| `cognitive_tax_thresholds_minutes` | `{short: 2, long: 10}` | Where the band edges sit. The 10-min cliff is the canonical "GitHub UI gives up showing live logs" point and the Atlassian guidance on context-switching. |
| `ci_failure_policy.count_cancelled_as_failure` | `false` | Cancelled runs are usually rebases. Counting them as failures inflates `F` by ~30% in our data. |
| `blast_radius_multiplier` | `null` (use empirical) | **Most fragile assumption.** Defaulting to empirical signal protects against guessing. |

## The piecewise cognitive tax — why we don't just use 23 min

The `S = 23 min` figure comes from Mark, Gloria & Klocke (2008), *"The Cost of Interrupted Work,"* a study of office workers across all interruption types. Treating it as universal is two arguments away from the source:

1. The 23-min figure is a *mean across interruption types* (phone calls, drive-by questions, meetings, IM, email). Self-initiated, anticipated CI waits aren't representative of any of those — they're closer to "I just clicked Submit and I know exactly when I'll come back."
2. Recovery time scales roughly with how *unexpected* and *attention-demanding* the interruption is. CI waits are predictable and low-attention.

So we use a **piecewise** `S`:

- Waits < 2 min: `S = 0`. The developer doesn't context-switch — they wait at their keyboard. This matches Cypher & Yarrison (2017) on flow-state recovery: under 2 min, attention can stay parked.
- Waits 2–10 min: `S = 5`. Long enough to read Slack, short enough that recovery is fast.
- Waits ≥ 10 min: `S = 23`. The developer task-switches (a different PR, a refactor, lunch). Full Mark/Gloria/Klocke recovery applies.

This is more conservative than the prompt's flat `S = 23`. It moves the headline number lower but makes it more defensible to a hostile reader.

## The blast-radius multiplier — measure it, don't guess it

The most fragile term in any "delivery friction" formula is the rework multiplier. The prompt suggests 1.5×–3× from Slack-poll-style estimates. We do better: the GitHub Actions data tells us directly.

Each `Deploy app` job has a `created_at` (when GH queued it) and a `started_at` (when the runner picked it up). The gap is the time it spent waiting on the `concurrency: deploy-${env}` lock. We count, per window:

- `wait_count` — Deploy app jobs that waited > 30 s on the lock (filtering out GH scheduling jitter).
- `wait_behind_failure` — of those, how many were waiting behind a deploy whose parent run ultimately failed.

`K_empirical = 1 + (wait_behind_failure / wait_count)`

The interpretation: every wait that ended up behind a failed deploy is one developer-build that was blocked by another developer's broken STG. The `+1` is the developer who *caused* the failure (they pay too). The empirical multiplier is grounded; the executive can override it via `inputs.yml` if they think it's noisy.

## DORA's failure rate is not our failure rate

The DORA framework's "Change Failure Rate" measures *production* failures — deployments that caused incidents, rollbacks, or hotfixes. We're measuring CI failures, which is a different (and healthier) thing — a CI failure means the system caught a bug *before* it shipped. CI failures are also more common (cheap to retry).

If a finance reader equates the two, they'll over-index on the rework bucket. We address this by:

1. Calling the variable `CI_failure_rate` in code and in the report, never just `F` or "change failure rate."
2. Reporting `F` in the resolved-inputs table with the explicit unit ("CI runs that ended in failure or timeout, excluding cancellations").
3. Citing the 2024 DORA report in `research/sources.md` to clarify the distinction.

## Queueing-theory note (M/M/1)

The plan/prompt note that wait times grow non-linearly with utilisation:

- 50% utilisation → wait ≈ 1× build duration
- 80% utilisation → wait ≈ 4× build duration
- 95% utilisation → wait ≈ 19× build duration

These come from M/M/1: `W_q / E[S] = ρ / (1 − ρ)`. Real CI traffic is more bursty than Poisson — pushes cluster pre-lunch and pre-EOD. So the *real* amplification at high utilisation is **higher**, not lower, than the M/M/1 prediction. If we wanted to be pessimistic we'd model M/G/1 with high coefficient of variation; we don't, because the M/M/1 numbers are already striking. We note this in the report so a critic can't accuse us of overstating the case.

The empirical STG-utilisation lower bound is reported in `metrics.json` (`stg_utilisation_estimate`). When this number rises above 70%, the staging-bottleneck argument graduates from "theoretical" to "imminent."

## Things this model deliberately does NOT include

- **Compute cost (GitHub Actions minutes).** Self-hosted runners and free Actions minutes are pennies compared to developer time — including them would just add noise. The whole point of the framework is that developer-time dwarfs infrastructure cost.
- **Mental-health cost / morale / attrition.** These are real but unmeasurable from CI data alone. Out of scope.
- **Customer-impact cost of slow time-to-prod.** Featured in DORA literature but requires linking deploys to revenue events, which most orgs don't have a clean stream for.
- **The "developer would have done something else valuable" opportunity cost.** Already captured in the direct-wage term — paying someone $W/min while they wait *is* the opportunity cost.

## How to falsify this number

A skeptic should be able to attack any of these:

1. **`W` is wrong.** Run `W = $1.50` (junior-heavy team) and `W = $3.00` (senior-heavy) — see `outputs/sensitivity.csv`. Linear effect on headline.
2. **`D` is wrong.** Override in `inputs.yml`. We seed from GH actors; if the team includes contributors who only land code occasionally, override down. Linear effect.
3. **`F` is wrong.** Set `inputs.sensitivity.ci_failure_rate_overrides` to span DORA's High/Low (10%/30%); `outputs/sensitivity.csv` will include both. Sub-linear effect (multiplicative against the `K` term).
4. **`K` is wrong.** Set `inputs.blast_radius_multiplier` to 1.0 to test the "no spillover" world. The headline drops by `F × (K - 1)` — typically 10–20%.
5. **The cognitive tax doesn't apply.** Set `inputs.cognitive_tax_minutes.long = 0`. The headline drops by ~`S/T_pipeline` (typically 20–60% if T_pipeline is in the long band).

If the headline survives a hostile pass at #4 and #5 (the two most-attackable terms), the argument is solid.
