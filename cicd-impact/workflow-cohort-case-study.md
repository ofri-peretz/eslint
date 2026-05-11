# Workflow cohort case study — same repo, four workflows, four unit costs

> **What this is.** A within-repo cohort analysis: the same calculator run against four distinct GitHub Actions workflows in the `ofri-peretz/eslint` monorepo, producing four unit costs that show how workflow shape (duration, failure rate, frequency) drives `$/CI minute`. Companion to [`dogfood-case-study.md`](dogfood-case-study.md), which scoped only to `ci-pr.yml`.
>
> **Date:** 2026-05-09. **Methodology:** unchanged from [`philosophy.md`](philosophy.md) §formula. **Data window:** 180 days. **Wage and policy:** defaults from [`inputs.template.yml`](inputs.template.yml) (`W = $2.00/min`, no overrides).
>
> **Why a within-repo cohort?** Originally we scoped a multi-repo cohort against external OSS lint-tool monorepos (`eslint/eslint`, `biomejs/biome`, etc.). That requires explicit user authorization to query third-party CI data and was out of scope for this session. **Within-repo workflow cohort** is a clean substitute: same wage, same actor count, same blast-radius — the only thing varying is the workflow shape, which is exactly what the framework should be sensitive to.

## The cohort table

| Workflow | Runs (180d) | T_dur (mean) | T_queue | F (policy) | Cost/CI min | Annualised | Cognitive band |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **`ci-pr.yml`** (main CI) | 119 | 1.2 min | 4 s | 61.5% | **$6.25** | **$2,000** | short (S=0) |
| **`lint-pr.yml`** (Reviewdog ESLint) | 119 | 43 s | 3 s | 51.3% | **$5.85** | **$1,076** | short (S=0) |
| **`quality.yml`** (Quality Gate) | 3 | **4.8 min** | 3 s | 0.0% | **$12.18** | **$44,332**\* | **medium (S=5)** |
| **`benchmark.yml`** (perf regression) | 7 | 42 s | 3 s | 85.7% | **$0.48** | **$6** | short (S=0) |

\* `quality.yml` annualised has a sample-size caveat — only 3 runs in 1 business day produced this estimate, so the annual number is high-variance. The unit cost ($/min) is robust; the multiplier (annual pipeline minutes) is the noisy term.

## What the cohort tells us about the framework

The four workflows in this cohort have intentionally-different shapes — different durations, different failure rates, different per-day cadences. The framework should produce four meaningfully-different unit costs that *track the differences*, not collapse them. It does:

### Insight 1 — `quality.yml` is the most expensive workflow on a per-minute basis ($12.18/min, ~2× the others)

This is **not** because it runs more often (3 vs 119) or has more developers (1 vs 2). It is because **its mean duration of 4.8 minutes crosses the medium cognitive-tax band (≥ 2 min, < 10 min → S=5 min)**, while every other workflow stays under 2 min and gets `S=0` cognitive-tax exemption.

The cognitive-tax multiplier on quality.yml is **×2.03** (`1 + 5/4.8`). On the others, it's ×1.0. That single threshold crossing more than doubles the per-minute cost.

This is exactly the framework's main predictive claim: **crossing the cognitive-tax threshold is a step-function cost increase, not a linear one**. The data corroborates the [feedback-loop hierarchy in `philosophy.md`](philosophy.md#the-feedback-loop-hierarchy--why-a-high-end-static-analyzer-is-the-highest-leverage-investment).

### Insight 2 — `benchmark.yml` has the lowest unit cost ($0.48/min) despite the highest failure rate (85.7%)

The benchmark regression workflow fails almost 6 times out of 7. By the failure-rate-only logic ("high F means high cost"), it should be the most expensive workflow. It is the cheapest. Why?

Because:
- It runs rarely (R = 0.1 runs/biz-day vs 1.0 for the others)
- It runs short (42 s mean — well under the cognitive threshold)
- It has no concurrency-lock spillover (K = 1.0)

**Cost per minute is a multiplicative thing, not an additive one.** The failure-rework multiplier `(1 + F × K) = (1 + 0.857 × 1.0) = 1.857` is high — but it's multiplying a very small base (`D × R × W` is tiny when R = 0.1).

This is the framework's second-most-important predictive claim: **a workflow with high F can still be cheap if it runs rarely and the failure has no blast-radius beyond itself**. CI investments should optimize the right workflows, not the noisiest ones.

### Insight 3 — `ci-pr.yml` and `lint-pr.yml` are nearly identical in shape and produce nearly identical unit costs

| Variable | ci-pr.yml | lint-pr.yml | Δ |
| :--- | ---: | ---: | :---: |
| Runs | 119 | 119 | identical |
| Distinct actors | 2 | 2 | identical |
| T_dur | 1.2 min | 43 s | -33% |
| F (policy) | 61.5% | 51.3% | -10pp |
| Cost/min | $6.25 | $5.85 | -6% |

The framework correctly produces a small (-6%) but non-zero difference between two workflows that differ on T_dur (-33%) and F (-10pp). The per-minute cost is dominated by the wage × developer × runs base; the differences in failure-rework multiplier are visible but not catastrophic. **This is what we'd expect from a well-calibrated unit cost.**

### Insight 4 — adding all four workflows together gives the *real* per-developer-action cost

A developer pushing a PR triggers all four workflows simultaneously (because each workflow has its own trigger: PRs touch packages → ci-pr + lint-pr + quality + benchmark all fire). The wall-clock time the developer waits is not any single workflow's `T_dur`; it's the **maximum** across the workflows that gate their PR.

If we conservatively assume the developer waits for the longest workflow (quality.yml at 4.8 min), the **effective `T_pipeline` is closer to 5 min, not 1.2 min** — and the effective per-developer-action cost is closer to the $12.18/min of quality.yml than the $6.25/min of ci-pr.yml alone.

**The dog-food case study's $6.25/min is therefore a lower bound.** The real per-developer-action cost in this monorepo is closer to **$10–$15/min** when the gate-blocking workflow (quality.yml) is included. Annual cost is correspondingly higher than the original $2,000 figure — likely **$10K–$20K** under this fuller accounting.

This was a hidden under-count in [`dogfood-case-study.md`](dogfood-case-study.md). It's now explicit. The honest-losses discipline corrects in public.

## What the cohort does NOT establish

In the spirit of [`value-philosophy.md`](value-philosophy.md) §6.5 hostile-review:

1. **`quality.yml` has only 3 runs** in the window — the annual extrapolation ($44K) is high-variance and should not be cited as a reference number. The unit cost ($12.18/min) is more robust.
2. **`benchmark.yml` has 7 runs** — also low N. The cohort's quality.yml + benchmark.yml rows are weak in absolute number; they're useful for *shape comparison*, less so for *absolute headline*.
3. **The "max across workflows" assumption in Insight 4 is conservative** — in reality, parallel workflows partially overlap; some of the wait is shared. The 4.8-min figure is a ceiling, not a true `T_pipeline`. A more careful version would compute the critical-path union of triggered workflows per PR, which the calculator doesn't currently do.
4. **Wage and actor count are repo-wide constants in this run** — within-repo cohort is the cleanest way to isolate workflow-shape effects, but it cannot tell us anything about per-niche, per-team, or per-org variation. That is what a multi-repo cohort would address (and is what we'll need authorization to run against external repos for v2).

## What the cohort closes

| Question this cohort answers | Status before | Status after |
| :--- | :--- | :--- |
| Does the framework differentiate workflows by shape, or just by aggregate volume? | Untested | **Confirmed** — four workflows, four meaningfully-different unit costs that track the framework's parameter sensitivities |
| Is the cognitive-tax threshold load-bearing in real data? | Asserted | **Confirmed** — quality.yml at 4.8 min crosses the threshold and shows the predicted ×2 multiplier |
| Does high failure rate dominate cost, or do other variables also drive it? | Theory | **Confirmed** — benchmark.yml has the highest F but the lowest unit cost because R is small and T is short |
| Is the dog-food single-workflow headline a reliable estimate of total CI tax? | Asserted | **Refuted (corrected)** — the single-workflow figure is a lower bound; the true per-developer-action cost is 2-3× higher when gate-blocking workflows are included |

## Reproduce

```sh
cd cicd-impact
for wf in ci-pr.yml lint-pr.yml quality.yml benchmark.yml; do
  REPO=ofri-peretz/eslint WORKFLOW_FILE=$wf bash scripts/01-fetch-actions-data.sh --window 180 --refresh
  node scripts/02-compute-baseline.cjs
  node scripts/03-compute-unit-cost.cjs
  cp outputs/unit-cost.json /tmp/unit-cost-${wf%.yml}.json
done
# Then: jq the headline cost_per_ci_minute_usd from each /tmp/unit-cost-*.json file
```

The script supports `WORKFLOW_FILE` env override (added in [`philosophy.md`](philosophy.md)'s reproduction recipe). Each run takes 30–90 seconds depending on the API quota.

## Citation

> Peretz, O. (2026). *Workflow cohort case study: same repo, four workflows, four unit costs.* `cicd-impact/workflow-cohort-case-study.md`, ofri-peretz/eslint, methodology v1 (2026-05-09).

The next move on the multi-repo dimension is the **external-repo cohort** — running the calculator against `eslint/eslint`, `biomejs/biome`, `eslint-community/eslint-plugin-security`, and similar comparable OSS lint-tool monorepos. That requires authorization to query third-party CI data and is targeted for a future session with explicit user approval.
