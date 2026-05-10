# `cicd-impact/` — what does a minute of CI/CD cost the org?

A defensible, reproducible answer to the question your supervisor will ask in a budget meeting:

> *"How much does it cost the company every time the build takes a minute longer?"*

The headline output is a **`$/CI minute`** number. Multiply it by minutes-saved-per-year and you have ROI for any CI investment. Multiply it by minutes-added-per-year and you have a defendable cost for any new CI step.

This folder is **org-agnostic**. The framework — formulas, scripts, narratives, the XLSX layout — is shareable. The values — your team size, wage assumption, measured pipeline durations — live in gitignored files alongside the framework. You can fork this folder, point it at any GitHub Actions repo, and produce your own version of the analysis without leaking anyone else's numbers.

## Read this in order

### Foundation and operational philosophy

1. [`value-philosophy.md`](value-philosophy.md) — **the foundation.** What value is (Buffett, Munger, the software-industry voices), the two ruling systems (capitalism + humanism) the philosophy must satisfy, why static code analysis is hard to measure, the unbroken chain from human incentives down to a single ESLint rule, hostile-review survival (§6.5, with Bradford Hill causal-inference assessment), falsifiable predictions (§6.6), and explicit scope limits (§6.7 — when this philosophy does NOT apply).
2. [`philosophy.md`](philosophy.md) — **why CI/CD friction matters at all.** The operational layer: three axes (money, velocity, deliverability), the investor frame, the feedback-loop hierarchy explaining why analyzer latency × quality is the right product, the **eight-niche investor-expectations table** with auditable derivation methodology, and why a unit cost is the right north-star metric.
3. [`methodology.md`](methodology.md) — **how the formula is derived.** Every coefficient and every variable either traces to a measurement or has a citation. Includes the "how to falsify this number" section.

### Operational artifacts

4. [`analyzer-evaluation-framework.md`](analyzer-evaluation-framework.md) — **how to evaluate any static analyzer.** Vendor-neutral six-dimension scorecard a buyer applies to SonarQube / Snyk / CodeQL / Semgrep / `@interlace/eslint-plugin-*` / anything. Operationalises the "what 'high-end' means" subsection in `philosophy.md`. Structurally answers Attack 7 (vendor-conflict) by being reusable against the alternatives.
5. [`data/niche-presets.json`](data/niche-presets.json) — **per-niche calculator inputs.** Ten-niche presets the calculator can load directly; each entry has investor metrics, recommended budget %, calculator overrides, and static-analysis priority hints.

### Worked examples

6. [`dogfood-case-study.md`](dogfood-case-study.md) — **the framework run on its own monorepo.** First published case study: real GitHub Actions data → real measured `$/CI minute` headline ($6.25/min, $2k/yr) for a small OSS project. Eats own dog food.
7. [`worked-example.md`](worked-example.md) — **continuous walk-through for a hypothetical 80-engineer fintech (Acme Pay).** Demonstrates the full chain: value-philosophy → philosophy → niche-preset → calculator → board-room paragraph. Shows the framework producing actionable output at mid-stage scale.
8. [`v0-competitor-scorecard.md`](v0-competitor-scorecard.md) — **the analyzer-evaluation framework applied to itself and 7 competitors.** Real precision/recall data from ILB-Arena (40-vuln corpus, 18 plugins scored); maintenance + adoption from npm; honest losses preserved (our adoption is small; latency comparison is a v1 deliverable). Eats own dog food on the framework.
9. [`workflow-cohort-case-study.md`](workflow-cohort-case-study.md) — **same repo, four workflows, four unit costs.** Within-repo cohort showing how workflow shape (duration, F, R) drives `$/CI minute`. Reveals that the dog-food single-workflow figure was a lower bound: real per-developer-action cost is 2–3× higher when the gate-blocking workflow is included. Honest correction in public.

### Discipline

10. [`predictions-registry.md`](predictions-registry.md) — **pre-registration of the seven §6.6 predictions** with horizons, falsification signals, and the philosophy section at stake for each. Git-tag-ready (`predictions-v1-2026-05-09`); external archive (Wayback / OSF) is a manual post-commit step.

### Implementation

8. The scripts in [`scripts/`](scripts/) — fetch GitHub Actions data, derive measured metrics, compute the unit cost, render the report, build the executive XLSX.
9. The research in [`research/`](research/) — primary sources and peer benchmarks for sanity-checking the headline.

## TL;DR

There are three layers. Read them in order.

1. **The unit cost (a `$/min` number).** Computed from team size × cadence × wage × cognitive multiplier × failure-rework multiplier. Lives in [`methodology.md`](methodology.md).
2. **The interactive workbook.** A 9-sheet XLSX where every assumption is a yellow cell. Built by [`scripts/05-build-xlsx.py`](scripts/05-build-xlsx.py); output goes to `outputs/cicd-impact-<your-org>.xlsx` (gitignored).
3. **The savings story.** What an org gets back by getting CI/CD faster — broken into the wage floor (irrefutable arithmetic), the full multiplier frame (defensible), and the investor frame (board-room).

## Folder layout

```
cicd-impact/
├── README.md                       ← you are here
├── value-philosophy.md             ← foundation: what value is + chain + hostile review + predictions + scope limits
├── philosophy.md                   ← operational: three axes + investor frame + niche table + feedback-loop hierarchy
├── analyzer-evaluation-framework.md ← vendor-neutral six-dimension scorecard for any analyzer
├── methodology.md                  ← formula derivation + defenses
├── dogfood-case-study.md           ← framework run on its own monorepo (real $6.25/min headline)
├── worked-example.md               ← hypothetical 80-eng fintech walk-through (continuous board-narrative)
├── v0-competitor-scorecard.md      ← scorecard run against 7 competitors with honest losses preserved
├── workflow-cohort-case-study.md   ← four workflows in one repo, four unit costs (corrects dog-food lower-bound)
├── predictions-registry.md         ← pre-registration of §6.6 predictions (git-tag-ready)
├── inputs.template.yml             ← shareable template — copy to inputs.yml
├── inputs.yml                      ← LOCAL ONLY — your wage / policy choices
├── .gitignore                      ← splits sensitive vs shareable
│
├── data/
│   ├── report-data.template.json   ← shareable template — copy to report-data.json
│   ├── report-data.json            ← LOCAL ONLY — drives the XLSX builder
│   ├── fixtures/                   ← synthetic toy data (safe to commit)
│   ├── runs-90d.json               ← LOCAL ONLY — raw GH Actions runs
│   ├── jobs-90d.json               ← LOCAL ONLY — per-job timings
│   ├── actors-90d.txt              ← LOCAL ONLY — distinct contributor logins
│   ├── metrics.json                ← LOCAL ONLY — derived metrics
│   └── fetched-at.txt              ← LOCAL ONLY — fetch cache timestamp
│
├── scripts/
│   ├── 01-fetch-actions-data.sh    ← gh api → data/*.json (env-overridable REPO)
│   ├── 02-compute-baseline.cjs     ← data/* → metrics.json
│   ├── 03-compute-unit-cost.cjs    ← metrics + inputs → unit-cost.json
│   ├── 04-render-report.cjs        ← unit-cost.json → markdown fragments
│   ├── 05-build-xlsx.py            ← report-data.json → cicd-impact-<org>.xlsx
│   └── lib/                        ← helpers (queueing, formatting, yaml)
│
├── outputs/                        ← all gitignored — derived reports live here
│   ├── unit-cost.json
│   ├── sensitivity.csv
│   ├── headline.md
│   ├── presentation-table.md
│   └── cicd-impact-<org>.xlsx      ← the workbook stakeholders open
│
└── research/
    ├── sources.md                  ← primary citations (Mark/Klocke, DORA, BLS, …)
    └── peer-numbers.md             ← public benchmarks for sanity-checking
```

**Sensitive files are gitignored** so a fresh checkout has zero org-specific values. Anyone forking the repo gets only the framework; the first thing they do is copy two templates and edit them.

## How the value flow works

```
                                  ┌─────────────────────────────┐
                                  │  GitHub Actions API         │
                                  │  (live data, last 90 days)  │
                                  └──────────────┬──────────────┘
                                                 │
                                                 │  REPO=<owner>/<repo> ./01-fetch...
                                                 ▼
   ┌──────────────────────────┐   ┌─────────────────────────────┐
   │  inputs.yml              │   │  data/                      │
   │  (wage, policy choices)  │   │   runs-90d.json             │
   │  human-edited            │   │   jobs-90d.json             │
   │                          │   │   actors-90d.txt            │
   └──────────────┬───────────┘   └──────────────┬──────────────┘
                  │                              │
                  │                              │  ./02-compute-baseline.cjs
                  │                              ▼
                  │               ┌─────────────────────────────┐
                  │               │  data/metrics.json          │
                  │               │  T_dur, T_queue, R, F, D,   │
                  │               │  empirical blast-radius     │
                  │               └──────────────┬──────────────┘
                  │                              │
                  └─────────────┬────────────────┘
                                │
                                │  ./03-compute-unit-cost.cjs
                                ▼
                ┌──────────────────────────────────┐
                │  outputs/unit-cost.json          │
                │  outputs/sensitivity.csv         │
                │  the headline $/CI minute        │
                └──────────────┬───────────────────┘
                               │
                ┌──────────────┴───────────────┐
                │                              │
   ./04-render-report.cjs                      │  human-curated narrative
                ▼                              ▼
   ┌──────────────────────────┐   ┌──────────────────────────┐
   │  outputs/headline.md     │   │  data/report-data.json   │
   │  outputs/                │   │  trend windows, region   │
   │    presentation-table.md │   │  comp, savings story     │
   └──────────────────────────┘   └──────────────┬───────────┘
                                                 │
                                                 │  ./05-build-xlsx.py
                                                 ▼
                                  ┌──────────────────────────┐
                                  │  outputs/                │
                                  │    cicd-impact-<org>.xlsx│
                                  │  (9 interactive sheets)  │
                                  └──────────────────────────┘
```

The CommonJS scripts (`01–04`) automate the pipeline from raw GitHub data to a measured `$/min`. The Python script (`05`) builds the executive XLSX from a hand-curated `report-data.json` that holds the trend windows, regional comp mix, and savings narrative.

## The two template files (the only files you copy + edit)

### `inputs.yml` — wage and policy

Drives `03-compute-unit-cost.cjs`. Contains:

- Loaded `$/dev-minute` (Low / Protective / Aggressive frames)
- Working days per year
- Cognitive-tax piecewise table (0/5/23 min by wait band, plus thresholds)
- Failure-policy switches (count cancelled? count timeouts?)
- Blast-radius override (or null = use empirical)
- Sensitivity-sweep multipliers

```sh
cp inputs.template.yml inputs.yml
# edit, then run scripts/03 to recompute unit cost
```

### `data/report-data.json` — drives the XLSX

Drives `05-build-xlsx.py`. Contains:

- `org_name` — used in titles and the killer one-liner
- `inputs_seed` — initial values for the workbook's editable cells
- `trend.windows` — measured durations at 90d / 30d / 14d / 7d (with sample sizes)
- `regional_comp` — engineer count + base salary per region
- `ref_salaries` — quick-lookup table for the Wage Calculator sheet
- `active_devs_options` — three counts (Core / Recommended / Upper bound) with rules

```sh
cp data/report-data.template.json data/report-data.json
# edit, then run scripts/05 to rebuild the XLSX
```

Everything in both files is annotated with what it is, where the default came from, and which audience it suits.

## Quickstart

For a brand-new fork pointed at a fresh repo:

```sh
# 1. one-time setup
cd cicd-impact
cp inputs.template.yml inputs.yml
cp data/report-data.template.json data/report-data.json
python3 -m venv .venv && .venv/bin/pip install openpyxl

# 2. pull live GitHub Actions data
REPO=<owner>/<repo> WORKFLOW_FILE=ci-cd.yml ./scripts/01-fetch-actions-data.sh

# 3. derive measured metrics
node scripts/02-compute-baseline.cjs

# 4. compute the unit cost
node scripts/03-compute-unit-cost.cjs

# 5. render markdown report fragments
node scripts/04-render-report.cjs

# 6. update report-data.json with the trend windows from step 3
#    (open data/report-data.json, paste mean/n values from data/metrics.json)

# 7. build the XLSX
.venv/bin/python scripts/05-build-xlsx.py
# → outputs/cicd-impact-<your-org>.xlsx
```

Iterating on values: edit `inputs.yml` or `data/report-data.json`, then re-run `03 → 04` (CommonJS) or `05` (Python). No re-fetch needed unless the underlying GitHub data has changed materially.

## The XLSX (the artifact stakeholders actually use)

`outputs/cicd-impact-<org>.xlsx` is a 9-sheet interactive workbook. Every yellow cell is editable; everything else is a formula that recalcs in Excel and Google Sheets.

| Sheet | What it shows |
| :--- | :--- |
| **README** | Onboarding, colour legend, sharing policy |
| **Savings** | The "what we already saved" story — wage floor, full frame, investor frame, three-sentence narrative |
| **Headline** | `$/CI minute` · `$/CI second` · annual / monthly / weekly / daily friction tax · decomposition into three buckets |
| **Trend** | Last 90 / 30 / 14 / 7 days happy-path duration with sample sizes and direction arrow |
| **Wage Calculator** | Annual salary in (with regional mix) → blended `$/min` out |
| **Inputs** | Every editable knob; yellow = your input, green = measured, purple = derived |
| **Vision** | What life looks like at 3 / 5 / 8 / 10 / current / 15 / 20 / 30 / 60-min pipelines |
| **Sensitivity** | 27-row sweep across wage × failure rate × blast radius |
| **Investments** | ROI ladder for proposed CI fixes |

## The formula (one line)

For each minute the pipeline runs, the company pays:

```
cost_per_ci_minute = (D × R × W) × (1 + S/T_pipeline) × (1 + F × K)
                       direct        cognitive tax        rework + spillover
```

- `D` — active developers (measured)
- `R` — runs per business day (measured)
- `W` — fully-loaded `$/dev-min` (input)
- `S` — context-switch minutes lost (piecewise: 0 / 5 / 23 by wait band)
- `T_pipeline` — `T_dur + T_queue` (measured)
- `F` — CI failure rate, policy-adjusted (measured + policy)
- `K` — blast-radius multiplier (empirical or input)

Annual: `cost_per_ci_minute × annual_pipeline_minutes`.

See [`methodology.md`](methodology.md) for the derivation, defenses against the four most-attackable assumptions, and what this model deliberately does NOT include. See [`philosophy.md`](philosophy.md) for the research-backed argument that a unit cost is the right metric to optimise — and how shaving minutes off the build pays back along three axes (money, velocity, deliverability).

## Sensitive vs shareable — what's gitignored

Files in `cicd-impact/.gitignore`:

| Pattern | Why |
| :--- | :--- |
| `inputs.yml` | Has the assumed wage |
| `data/report-data.json` | Has team size, trend numbers, regional comp |
| `data/runs-90d.json`, `jobs-90d.json`, `actors-90d.txt` | Real GitHub data + actor logins |
| `data/metrics.json`, `fetched-at.txt` | Derived from above |
| `outputs/cicd-impact-*.xlsx` | The workbook embeds all the values |
| `outputs/unit-cost.json`, `sensitivity.csv`, `headline.md`, `presentation-table.md` | Same |
| `EXECUTIVE-REPORT.md` | If present, contains the headline narrative |
| `.venv/` | Python venv |

Everything else is committed. A fresh fork has zero values until you copy the two templates.

## Reusing across services

The framework is intentionally portable. To run the same analysis against a different repo:

```sh
REPO=AcmeCo/api-service WORKFLOW_FILE=ci.yml ./scripts/01-fetch-actions-data.sh --refresh
node scripts/02-compute-baseline.cjs
# update report-data.json — at minimum, change org_name and trend windows
.venv/bin/python scripts/05-build-xlsx.py
# → outputs/cicd-impact-acmeco-api.xlsx
```

The XLSX filename is derived from `org_name` in `report-data.json`, so multiple orgs' workbooks coexist in `outputs/`.

If you have a central deploy-event aggregator (a repo that catches `repository_dispatch` events from every service's CI), tap that for cross-service rollup before running this per-repo. See [`research/peer-numbers.md`](research/peer-numbers.md) for the rollup recipe.

## How to defend the headline

In the order an executive will challenge them:

| Attack | Defense |
| :--- | :--- |
| "The 23-min context-switch is folkloric." | We use a piecewise `S` (0 / 5 / 23) and only apply 23 above the 10-min threshold. See [`methodology.md`](methodology.md). |
| "The blast-radius multiplier is made up." | We measure it from concurrency-lock waits behind failed deploys. The input lets you override the empirical signal — not seed it. |
| "DORA's failure rate isn't 30%." | DORA measures *production* failures. We measure *CI* failures, which are higher and healthier. The variable is named `CI_failure_rate` to avoid the conflation. |
| "M/M/1 is too pessimistic." | It's actually too **optimistic** for bursty CI traffic. The real wait at high utilisation is worse than M/M/1 predicts. |
| "We don't have a staging bottleneck." | Look at the target repo's CI workflow for `concurrency: deploy-${env}` with `cancel-in-progress: false`. If it's there, the bottleneck is real — the YAML is the proof. |

## What's NOT included (so nobody can claim we're inflating it)

- **GitHub Actions compute cost** (~$0.008/min) — pennies vs. developer time. Ignored.
- **Customer-impact cost of slow time-to-prod** — featured in DORA but unmeasurable from CI data alone.
- **Mental health / morale / attrition** — real but unquantifiable.
- **Production failures (DORA's CFR)** — different from CI failures. We don't conflate.

## Troubleshooting

- **`05-build-xlsx.py` errors with "report-data.json not found"** — copy the template first: `cp data/report-data.template.json data/report-data.json`.
- **Numbers in the XLSX look like the seeded defaults** — you forgot to fill `report-data.json`. The template has zeros where org-specific values go.
- **`01-fetch-actions-data.sh` errors with "REPO not set"** — pass it via env: `REPO=<owner>/<repo> ./scripts/01-fetch-actions-data.sh`.
- **The headline `$/min` looks impossibly large or small** — check `inputs.yml` `wage_per_minute_usd` first; it has linear effect on the headline. Then check `K_blast_radius` and `D_active_developers`.
