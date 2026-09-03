# Dog-food case study — running this calculator on its own monorepo

> **What this is.** The first published case study of the `cicd-impact/` framework, run against the `ofri-peretz/eslint` monorepo's own CI. Eats own dog food: if we won't apply the framework to ourselves, why should anyone else apply it to themselves?
>
> **Date:** 2026-05-09. **Methodology version:** v1.0 (philosophy.md + value-philosophy.md as of 2026-05-09).
>
> **Headline:** `$6.25 per CI/CD minute · $2,000 annualised` for a 2-developer JavaScript ESLint-plugin monorepo over a 180-day window.

## What this case study validates

1. **The framework runs end-to-end on real GitHub Actions data without code changes.** `01-fetch` → `02-baseline` → `03-unit-cost` → `04-render` produced a defendable headline number from `gh api` data alone. No manual inputs beyond `inputs.template.yml` defaults.
2. **The calculator handles the small-N case gracefully.** The eslint monorepo is a single-developer-led OSS project with low-volume CI (~1 run/biz-day). The framework produced a coherent number; it did not blow up or report nonsense at the small-team boundary.
3. **The decomposition matches what the philosophy predicts.** Cognitive tax → $0 (T_pipeline of 1.2 min is below the 2-min threshold per piecewise S formula); failure rework dominates the multiplier (F = 61.5% × K = 1.0); direct waste sets the floor.

## Headline

**$6.25 per CI/CD minute** ($0.1041/second). Annualised: **$2,000**.

This is the cost the engineering team pays for each minute that the CI/CD pipeline takes to run, accounting for direct idle time, focus-loss, and spillover when builds fail. It is a *unit cost*: every minute saved (or added) multiplies it by the number of pipeline-minutes-per-year.

Annual pipeline-minutes (the multiplier): **314** = 1.3 min/run × 1.0 runs/biz-day × 250 biz-days × 2 devs.

## Decomposition (annual)

| Bucket | Annual cost | Multiplier | Notes |
| :--- | :---: | :---: | :--- |
| **Direct waste** (`D × R × W` × pipeline minutes) | $1,200 | floor | Wage × developer-time × runs |
| **Cognitive tax** (`1 + S/T_pipeline`) | $0 | ×0.00 | T_pipeline = 1.2 min, below 2-min `short_threshold` ⇒ S = 0. Fast pipelines get zero cognitive tax — by design. |
| **Failure rework** (`1 + F × K`) | $748 | ×0.62 | F = 61.5% (high; reflects fast-iteration WIP commits in a single-developer monorepo) × K = 1.0 (no concurrency-lock spillover; npm-publish workflow has no shared deploy lock) |
| **Total annualised** | **$2,000** | | |

## Resolved inputs (measured + executive)

| Variable | Value | Source |
| :--- | :--- | :--- |
| `W` — wage/min | $2.00/min | Default seed (`inputs.template.yml`); not overridden |
| `D` — distinct active developers | 2 | **Measured** from GitHub `actor` field over the window |
| `R` — runs/business day | 1.0 | **Measured** |
| `T_dur` — pipeline duration mean | 1.2 min | **Measured** (p90: 3.5 min) |
| `T_queue` — queue time | 4 s | **Measured** (essentially zero — no concurrency lock) |
| `F` — CI failure rate | 61.5% | **Measured**, policy-adjusted (cancellations not counted; timeouts counted) |
| `K` — blast-radius multiplier | 1.00 | **Measured empirically** — 0 of 0 deploy-job waits behind failures (no shared lock) |
| `S` — cognitive tax | 0 min | T_pipeline below short threshold ⇒ short band |

## Sensitivity sweep (top excerpts)

The full 27-row sweep is in `outputs/sensitivity.csv` (gitignored — sensitive). Key boundaries:

| Wage multiplier | K | F | Cost/CI min | Annual |
| :---: | :---: | :---: | :---: | :---: |
| 0.75× | 1.0 | 0.10 | $3.19 | $1,003 |
| 1.00× (base) | 1.0 | **0.615 (measured)** | **$6.25** | **$2,000** |
| 1.25× | 3.0 | 0.30 | $9.18 | $2,890 |
| 1.25× | 3.0 | 0.50 | $12.32 | $3,879 |

The headline is moderately sensitive to wage and failure rate; mostly insensitive to blast radius (because empirical K = 1.0 and any override above 1.5 produces only modest movement at this scale).

## Methodology

- **Repo:** `ofri-peretz/eslint`
- **Workflow file:** `ci-pr.yml` (the PR-triggered "CI Workflow")
- **Window:** 180 days (2025-11-10 → 2026-05-09); 172.4 calendar days, 123.1 business days
- **Sample size:** 119 runs, 203 jobs, 2 distinct actors
- **Wage seed:** $2.00/min (~$240k/yr fully-loaded; mid-band US senior software engineer per BLS OEWS + Levels.fyi)
- **Inputs file:** [`inputs.template.yml`](inputs.template.yml) (no overrides applied in this run; defaults preserved to demonstrate the seeded path)

## What this case study **does not** validate

In the spirit of [`value-philosophy.md`](value-philosophy.md) §6.5 hostile-review discipline, the limitations of this run:

1. **N is small.** 119 runs / 2 actors is below the framework's typical operating range (designed for 20–40 active devs and 200–500+ runs per quarter). The headline is real, but its 95% confidence interval would be wide. A multi-org study (Prediction 5 in §6.6) is needed to establish ranges.
2. **No `quality.yml` aggregation.** This run uses one workflow file (`ci-pr.yml`). The repo runs additional workflows in parallel (lint-pr, quality, benchmark, sdk-*) on every PR; the true `T_pipeline` per developer-action is the maximum across all workflows triggered, not the duration of any single one. The headline is therefore a **lower bound** — if anything, the real cost is higher.
3. **Single-developer-led monorepo.** D = 2 here means `D × R × W` is small; the framework is showing what it does at the "personal OSS project" boundary. A 50-dev org running this would see headline `$/CI minute` 25× higher with similar `T_pipeline`.
4. **F = 61.5% is high.** This reflects fast-iterating WIP commits in a single-developer flow ("commit, see CI fail, fix, push again" is normal here). In a team setting with stricter pre-push hygiene, F would be 15–25% — and the failure-rework multiplier would drop accordingly.

These caveats are why the published number is `$6.25/min for this monorepo at this size with these caveats`, not `$6.25/min as a universal reference`.

## Comparison to niche presets

The closest niche-preset for this case (per [`data/niche-presets.json`](data/niche-presets.json)) is **`infra-devtools`**: an OSS-first JavaScript/TypeScript developer-tools project. The preset recommends:

| Parameter | Preset (`infra-devtools`) | This run | Match? |
| :--- | :--- | :--- | :--- |
| `wage_per_minute_usd` | $2.40 | $2.00 (default) | Close; preset assumes senior-heavy DX talent |
| `cognitive_tax_thresholds_minutes.long_threshold` | 7 (tight) | 10 (default) | Default would tighten if applied |
| `blast_radius_multiplier` | 2.5 (downstream OSS consumers amplify) | 1.0 (empirical, this monorepo) | Diverges — empirical signal wins for the headline; the 2.5 captures *external* blast that the calculator doesn't see |
| `recommended_lint_budget_pct_of_payroll_range` | [2.0%, 3.0%] | n/a (single-developer) | Preset is for multi-engineer orgs |

Applied to a hypothetical 30-engineer infra/devtools company shipping a similar lint-tool monorepo, the headline `$/CI minute` would scale to roughly **$6.25 × (30/2) = $94/min**, or **~$30k/yr direct + cognitive tax once T_pipeline crosses 10 min** — comfortably justifying a 2–3% lint-budget allocation per the preset.

## Implications for the framework

What this run proves about the framework itself:

1. **The four scripts execute cleanly** on a real GitHub Actions repo with the documented inputs. No manual patching required.
2. **The decomposition matches the philosophy.** Fast pipelines get zero cognitive tax (by design); high-failure-rate single-developer flows have rework dominating the multiplier; no-concurrency-lock systems get K = 1.0 empirically. Each piece behaves as the math predicts.
3. **Small-N is gracefully handled.** No nonsense numbers, no division-by-zero, no extrapolation past the data — the framework reports what it can measure and stops.

What this run **doesn't** prove (open items, with horizons):

1. The `$/CI minute` number for this monorepo doesn't generalise — it's one data point. A multi-org cohort study is what closes Prediction 5 in [§6.6](value-philosophy.md#66-falsifiable-predictions--what-this-philosophy-claims-will-happen).
2. The framework's response to a *high-utilisation* repo (where the M/M/1 amplification matters) hasn't been demonstrated by this run, because this monorepo has T_queue ≈ 0.
3. The *cost-saving* effect of lint-rule investment hasn't been measured — this run gives a baseline; a follow-up that introduces a slow lint step and re-runs the calculator would close that loop.

## Reproduction (any GitHub-Actions repo)

```sh
cd cicd-impact
cp inputs.template.yml inputs.yml
cp data/report-data.template.json data/report-data.json
REPO=<owner>/<repo> WORKFLOW_FILE=<your-workflow.yml> bash scripts/01-fetch-actions-data.sh --window 180
node scripts/02-compute-baseline.cjs
node scripts/03-compute-unit-cost.cjs
node scripts/04-render-report.cjs
cat outputs/headline.md
```

Five commands. The headline number falls out at the end. Override any default in `inputs.yml`; the framework recomputes from the same measured baseline.

## Source data (gitignored — generated locally)

- `data/runs-90d.json` — 119 workflow runs, raw GitHub Actions API output
- `data/jobs-90d.json` — 203 per-job timings (queue + execution)
- `data/actors-90d.txt` — distinct contributors (2 over the window)
- `data/metrics.json` — derived measurements per [`scripts/02-compute-baseline.cjs`](scripts/02-compute-baseline.cjs)
- `outputs/unit-cost.json` — derived headline + decomposition per [`scripts/03-compute-unit-cost.cjs`](scripts/03-compute-unit-cost.cjs)
- `outputs/sensitivity.csv` — 27-row sweep across wage × K × F

These files contain real GitHub data and are gitignored per [`.gitignore`](.gitignore). The headline numbers in this case study are the only public-facing artifacts.

## Citation

If you cite this case study in your own analysis or post:

> Peretz, O. (2026). *Dog-food case study: running the cicd-impact framework on its own monorepo.* `cicd-impact/dogfood-case-study.md`, ofri-peretz/eslint, methodology v1.0 (2026-05-09). [`cicd-impact/dogfood-case-study.md`](cicd-impact/dogfood-case-study.md).

The next case study should be a multi-developer org. If you're willing to run the framework on yours and publish the headline (or share the data), get in touch — that closes the next prediction.
