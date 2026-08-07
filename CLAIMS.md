# Claims Registry — Interlace eslint-plugins

> Every marketing claim in this repo's docs and home page is mapped here to its evidence file. Format mandated by the [Interlace Evidence Framework](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).
>
> If a claim doesn't have a row, it can't ship in the docs. If "Last verified" is older than 90 days, the claim is **stale** and gets a "verification pending" banner in docs until refreshed.
>
> Sister registry: [`serverless/CLAIMS.md`](https://github.com/ofri-peretz/serverless/blob/main/CLAIMS.md).

## Provenance disclosure (2026-05-13)

A 2026-05-10 schema-backfill pass (`scripts/ilb-result-schema-backfill.ts`) re-wrote every pre-existing dated result JSON in `benchmarks/results/` to add `toolchain` / `schemaVersion` / `environment` fields. The backfill could not recover the **original** Node / ESLint / TypeScript / platform values, so every pre-2026-05-10 result now reports `toolchain.backfilled: true` with those fields set to `"unknown"`. **Practical consequence:** for any pre-2026-05-10 dated result file, the headline numbers can still be read off the JSON, but you cannot pin a reproducible run to the toolchain that produced them. The "reproducible via `npm install` + `npm run ilb:diff`" assertion stands going forward — every new dated result must carry real toolchain fields — but is **not** retroactively true. Rows below citing pre-2026-05-10 files inherit this caveat; rows verified on or after 2026-05-13 do not.

A 2026-05-13 audit (see plan file `please-review-our-repository-parsed-catmull.md` § Tier 0.1) also surfaced that the suite previously called **`ilb-juliet`** is not NIST's Juliet test suite — it is our own self-authored CWE corpus (`benchmarks/corpus/CWE-*`, 22 vulnerable + 22 safe across 10 CWEs, 2–3 fixtures per side per CWE). **Renamed to `ilb-cwe-corpus` on 2026-05-13** across the suite directory, results directory, npm scripts (`npm run ilb:cwe-corpus`), benchmarks README standards-mapping table, scorecard generator, and CI workflow. Pre-2026-05-13 result files still carry `bench: "ILB-Juliet"` in their JSON — the backfill script maps both legacy names to the new bench label, but those historical JSONs are read-only history. The README's "Industry parallels" table was also updated: we previously claimed NIST SARD/Juliet and OWASP Benchmark v1.2 as scored corpora; the honest version is that we mirror their *layout and methodology*, not their corpora. Integrating a real NIST Juliet / OWASP Benchmark adaptation is tracked as plan-file Tier 0.4.

## Verified claims

### Security detection (ilb-arena suite)

| Claim (as it appears in docs/marketing) | Suite | Latest result | Last verified |
| --- | --- | --- | --- |
| "Top of leaderboard on the ILB-Arena 40-vuln / 38-safe corpus (1st of 18 plugins tested, 17 security-relevant)" | ilb-arena | [2026-05-03.json](benchmarks/results/ilb-arena/2026-05-03.json) `summary.leaderboard[0].rank == 1` | 2026-05-13 (re-verified against cited file) |
| "Next-best plugin scores 66.1% F1 (eslint-plugin-jsdoc)" | ilb-arena (relative ranking) | [2026-05-03.json](benchmarks/results/ilb-arena/2026-05-03.json) `summary.leaderboard[1].f1Score == "66.1%"` | 2026-05-13 (re-verified against cited file) |

### ESLint version support

| Claim (as it appears in docs/marketing) | Evidence | Last verified |
| --- | --- | --- |
| "Supports ESLint 8.40+, 9, and 10" | All 35 ESLint-consuming packages declare `peerDependencies.eslint: ^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0`. **Narrowed 2026-08-06 ([#407](https://github.com/ofri-peretz/eslint/pull/407)):** the floor was `^8.0.0`, which claimed 8.0.0–8.39.x — releases predating `context.sourceCode` / `context.filename` (added in 8.40.0, read at 333 call sites across 231 files in 22 packages) and never installed by any CI job, since the version matrix resolves `eslint@^8` to the newest v8. Measured on `eslint-plugin-nestjs-security@2.1.0`: 8.0.0 and 8.39.0 throw on load, 8.40.0 produces the expected finding — per-version table in [`docs/ESLINT_VERSION_SUPPORT.md`](docs/ESLINT_VERSION_SUPPORT.md). The range now states the oldest minor the rules actually run on. Benchmark fixtures for each major in [`benchmarks/suites/ilb-arena/eslint{8,9,10}-compat/`](benchmarks/suites/ilb-arena/). **Closed 2026-05-13 (Open Item #6):** removed-in-v10 context APIs (`context.getFilename()` / `getSourceCode()` / `getCwd()`) — 140-file scope at the 2026-05-10 audit — now report **zero matches in `packages/eslint-plugin-*/src/rules`** (one harmless reference remains as a code-comment in a test file). `cicd-impact/scripts/eslint10-compat-test.mjs` runs the full lodash 1,046-file corpus cleanly on ESLint 10.3.0: **0 parse errors, 875 issues, 0.76 ms/file, ~800 ms median over 3 runs**. The 875-vs-pre-migration-1,351 finding-count delta is attributable to the script's pre-existing `secure-coding/detect-object-injection: 'off'` scoping (~95% FP rate on `obj[var]` per `competitor_study_2026-05-09.md`), not an ESLint-10 regression. CI guard alive: [`.github/workflows/eslint-version-matrix.yml`](.github/workflows/eslint-version-matrix.yml) runs the cross-version matrix on every PR touching `packages/eslint-plugin-*/**` plus a weekly Sunday cron. Runbook archived at [`cicd-impact/eslint10-migration-runbook.md`](cicd-impact/eslint10-migration-runbook.md). | 2026-05-13 |
| "Supported majors cover ~90% of weekly ESLint downloads" | 51.13% (v9) + 28.29% (v8) + 11.08% (v10) = **90.49%**. Shares derive from `api.npmjs.org/versions/eslint/last-week` (213.3M summed across exact versions); npm's package-level endpoint reports ~154M for the same window, so the **ratio** is the claim, not the absolute total. Snapshot in [`benchmark-results/eslint-version-stats.json`](benchmark-results/eslint-version-stats.json); refresh via `npm run stats:eslint-versions` | 2026-08-02 (live pull) |

### Performance — circular dependency detection (ilb-perf-import-no-cycle suite)

| Claim (as it appears in docs/marketing) | Suite | Latest result | Last verified |
| --- | --- | --- | --- |
| "import-next is 3.1x faster end-to-end than eslint-plugin-import on a 5,736-file React codebase" (4,682 excluding tests/stories) | ilb-perf-import-no-cycle (real-codebase: snappy-dashboard) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) `corpus.files` / `corpus.filesNonTestNonStories` | 2026-05-03 |
| "8x faster in pure rule execution time" | ilb-perf-import-no-cycle | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Cycle detection completes in ~4.9s on 455K LoC" | ilb-perf-import-no-cycle (Phase 6 ruleTimeMs) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Memory overhead +29 MB (within the <50 MB target)" | ilb-perf-import-no-cycle (peakRssMb) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) — 4,064 MB ours vs 4,035 MB official | 2026-05-03 |
| "100% detection parity with official plugin" | ilb-perf-import-no-cycle (detection accuracy) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Synthetic-corpus 25.7x speedup at 1K files" (54.9x at 5K files) | ilb-perf-import-no-cycle (synthetic) | [2026-01-02.json](benchmarks/results/ilb-perf-import-no-cycle/2026-01-02.json) | 2026-01-02 — **cannot currently be re-verified**, see note below |

> **⚠️ The cited result file contradicts itself in two places (found 2026-08-02).** Both are resolved above in favour of the *defined* fields, but the file itself should be corrected when the harness lands:
>
> 1. **File count.** `corpus.files` is **5,736** and `corpus.filesNonTestNonStories` is **4,682**, but the file's own `summary.headline` says **"5,483-file"** — a third number matching neither field, with no filter given that produces it. Docs previously repeated the 5,483. They now cite the two defined fields.
> 2. **Memory.** `kpiStatus.peakRss.phase6` says **"~0 MB"**, but the raw `measurements.peakRssMb` are **4,064 MB** (ours) vs **4,035 MB** (official) — a **+29 MB** delta. Docs previously repeated "~0 MB". They now cite the measured delta, which still clears the stated `≤ +50 MB` target.
>
> **⚠️ Every row in this table is stale as of 2026-08-02 (91 days).** The registry's own rule is that a claim older than 90 days is stale and gets a verification-pending banner in docs until refreshed. These rows crossed that line on 2026-08-01. They are still the **best-evidenced** figures available — and strictly better than the withdrawn 100x, which had no evidence at any age — but public copy citing them should be read as pending re-verification, not freshly confirmed. Refreshing them is blocked on the harness gap below.
>
> **⚠️ The `ilb-perf-import-no-cycle` suite has no runnable harness in this repo.** `benchmarks/results/ilb-perf-import-no-cycle/` holds result JSONs, but there is no matching `benchmarks/suites/ilb-perf-import-no-cycle/` and no npm script that regenerates them — the two dated files were produced out-of-tree. The real-codebase run **identifies** its runner (`scripts/benchmark-circular-deps.mjs` in the private `snappy-client-dashboard` repo), but a named runner in a private repo is *not* independently reproducible: no reader of this repository, and no maintainer without access to that private codebase, can re-run it. The synthetic run names no runner at all. Consequences: (1) the synthetic row is frozen at its 2026-01-02 values and cannot be refreshed by "re-running the suite" — re-verifying it means **writing a new harness plus a synthetic cyclic-corpus generator first**; (2) prefer the real-codebase rows for public copy — not because they are reproducible, but because they are measured on a real codebase rather than a generated one, and their provenance is at least named. Building an in-repo, publicly reproducible harness is tracked under "Pending claims" below and is the only thing that clears both warnings.

### Performance — graph-shape matrix (ilb-perf-import-shapes suite)

Reproducible from committed source, unlike the suite above:
`node benchmarks/scripts/generate-fixtures.js shapes` then
`node benchmarks/scripts/run-benchmark.js ilb-perf-import-shapes --iterations=3`.
Detection parity is checked per shape **before** any timing is trusted, and a run
that fails is recorded as a failure rather than a duration — a crashed run exits
early, so timing it would score the crash as a win.

| Claim (as it appears in docs/marketing) | Suite | Latest result | Last verified |
| --- | --- | --- | --- |
| "`eslint-plugin-import` crashes on deep import chains; `import-next` completes them" | ilb-perf-import-shapes (`chain-5000`) | [2026-08-02.json](benchmarks/results/ilb-perf-import-shapes/2026-08-02.json) — official `failed: exit 2` (`RangeError` in its own `lib/scc.js`), ours 11.42s. Standalone repro: [`benchmarks/scripts/repro-deep-chain.mjs`](benchmarks/scripts/repro-deep-chain.mjs) | 2026-08-02 |
| "~1.1x faster on dense cyclic graphs and on cold single-file runs" | ilb-perf-import-shapes (`dense-5000`, `single`) | [2026-08-02.json](benchmarks/results/ilb-perf-import-shapes/2026-08-02.json) — dense 3.96s vs 3.64s · single 0.39s vs 0.36s (medians) | 2026-08-02 |
| "Parity on graphs with no cycles to find" | ilb-perf-import-shapes (`flat-5000`) | [2026-08-02.json](benchmarks/results/ilb-perf-import-shapes/2026-08-02.json) — 2.30s vs 2.25s (medians) | 2026-08-02 |

> **⚠️ `wide-5000` is unresolved — do not claim a result on it.** Two
> measurements disagree and neither is trustworthy enough to settle it. The
> committed sequential run gives **0.8x — us slower** (3.22s vs 3.85s medians);
> a separate n=7 interleaved run gives **1.01x — a dead tie** (2.81s vs 2.80s).
> The sequential harness ran all of one plugin's iterations before the other's,
> which hands any load that builds during the window entirely to whoever goes
> second, so its verdict is biased against us by construction. `runner.js` now
> interleaves and alternates order, but the re-run that would settle this has
> not been done on a quiet machine: the attempt on 2026-08-03 recorded 46s and
> 78s medians on a shape that measures ~2.8s idle (load average 340 from
> concurrent builds) and was discarded.
>
> **Until a quiet-machine interleaved run exists, the honest statement is that
> `import-next` wins the deep-chain case outright, is ~1.1x faster on dense and
> cold-single-file, ties on flat, and is unmeasured on wide.** Do **not** write
> "never slower on any graph shape tested" — the only committed number for wide
> contradicts it.
>
> **Scope limit.** Four usable synthetic shapes plus one real codebase. Medians,
> not means: on `wide-5000` a single outlier moved the mean enough to invert the
> verdict in one run.

### CI/CD impact framework — value, philosophy, methodology

These are framework-level claims, not measurement claims. The "evidence" is the published artifact; the "last verified" date is the last time the artifact was reviewed for org-agnosticism (no internal data leaked) and citation freshness.

| Claim (as it appears in docs/marketing) | Artifact | Source | Last verified |
| --- | --- | --- | --- |
| "Value of static code analysis grounded in Buffett/Munger + software-industry leaders, satisfying both the capitalist and humanist tests" | [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) | 35 numbered sources (Aristotle → Andreessen) | 2026-05-09 |
| "Three-axis CI/CD impact model — money, velocity, deliverability — plus an investor frame mapping each axis to burn efficiency / lead-to-revenue / CFR-driven churn / M&A tech-DD" | [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) | DORA 2024, Mark/Gloria/Klocke 2008, Reinertsen 2009, BLS, Levels.fyi, Atlassian, CircleCI 2023 | 2026-05-09 |
| "Defendable `$/CI minute` formula — `(D × R × W) × (1 + S/T_pipeline) × (1 + F × K)` — every coefficient measurable or cited" | [`cicd-impact/methodology.md`](cicd-impact/methodology.md) | 15 numbered sources in [`cicd-impact/research/sources.md`](cicd-impact/research/sources.md) | 2026-05-09 |
| "Forkable calculator: any GitHub Actions repo can produce its own `$/CI minute` headline + 9-sheet executive XLSX without code changes" | [`cicd-impact/scripts/`](cicd-impact/scripts/) (01–05) | Synthetic fixtures in [`cicd-impact/data/fixtures/`](cicd-impact/data/fixtures/) | 2026-05-09 |
| "Eight-niche investor-expectations table with auditable budget-derivation methodology — per-niche recommendations land within the published ranges using a four-factor formula plugged with primary-source per-industry data" | [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) "Investor expectations and recommended static-analysis investment by software niche" + "How the niche-budget recommendations were derived" | DORA 2024, IBM Cost of a Data Breach, Bessemer, OpenView, a16z by sector, Verizon DBIR | 2026-05-09 |
| "Per-niche calculator presets loadable directly into `inputs.yml` and `report-data.json` — 10 niches, each with investor metrics, recommended budget range, expected velocity uplift, and static-analysis priority" | [`cicd-impact/data/niche-presets.json`](cicd-impact/data/niche-presets.json) | Cross-references `cicd-impact/philosophy.md` niche table | 2026-05-09 |
| "Vendor-neutral six-dimension analyzer-evaluation framework — same scorecard applies to SonarQube / Snyk / CodeQL / Semgrep / our plugins; structurally answers vendor-conflict skepticism" | [`cicd-impact/analyzer-evaluation-framework.md`](cicd-impact/analyzer-evaluation-framework.md) | NIST SARD / Juliet, OWASP Benchmark v1.2 methodology | 2026-05-09 |
| "Hostile-review survival: 7 attacks named, 5 fully defended, 2 explicitly conceded as open items, with Bradford Hill causal-inference assessment for the CFR feedback loop (7 of 9 criteria met)" | [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) §6.5 | Bradford Hill 1965; DORA 2024 longitudinal; Reinertsen 2009 mechanism; Kleinrock 1975 | 2026-05-09 |
| "Seven falsifiable predictions with stated horizons — each prediction names the data signal that would falsify it and the philosophy section at stake if it fails" | [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) §6.6 | Self-imposed; tracked across DORA reports / npm download stats / IBM annual breach reports | 2026-05-09 |
| "Eats own dog food: framework runs end-to-end on its own monorepo with real GitHub Actions data, producing $6.25/CI minute · $2,000 annualised over a 180-day window with 119 runs" | [`cicd-impact/dogfood-case-study.md`](cicd-impact/dogfood-case-study.md) | Real `gh api` data from `ofri-peretz/eslint`; framework output validated end-to-end | 2026-05-09 |
| "Continuous worked example demonstrating the full chain from value-philosophy → philosophy → niche-preset → calculator → board-narrative for an 80-engineer fintech (Acme Pay) producing a $180K/year headline with $1.56M ARR-at-risk and a 3.5× year-1 ROI on a 3% lint-budget recommendation" | [`cicd-impact/worked-example.md`](cicd-impact/worked-example.md) | Cross-references all other framework docs; numbers fall inside published per-niche ranges | 2026-05-09 |
| "Bradford Hill causal-inference assessment: 7 of 9 epidemiological criteria for inferring causation from observational evidence are met for the slow-CI → high-CFR feedback loop, with criterion 8 (controlled experiment) explicitly open" | [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) §6.5 Attack 4 | Bradford Hill 1965; DORA 2024 longitudinal; CircleCI 2023; GitLab 2024; Reinertsen 2009; Kleinrock 1975 | 2026-05-09 |
| "Auditable niche-budget derivation: four-factor formula (`base_pct × cfr_severity × disclosure_cost × deploy_freq × efficacy`) with each multiplier traced to a primary source; three worked derivations match published table within ±0.3pp" | [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) "How the niche-budget recommendations were derived" | McKinsey DVI; DORA 2024; IBM Cost of a Data Breach 2024 | 2026-05-09 |
| "Explicit scope limits: 7 named regimes where this philosophy does NOT apply (solo developer, throwaway prototype, internal tools, regulated mandated tooling, sunsetting codebase, research codebase, pre-revenue seed startup), each with what-still-applies guidance" | [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) §6.7 | Self-imposed scope discipline | 2026-05-09 |
| "Rule-level economic case for 17 strategic rules across 8 plugins (secure-coding, crypto, node-security, express-security, pg, mongodb-security, lambda-security, vercel-ai-security) — each rule's docs include a Value & investment case section linking CWE, feedback-loop tier, defensive-layer leverage, niche relevance, and investor-frame impact back to the cicd-impact framework" | Each rule's `docs/rules/<rule>.md` | Per-rule CWE / OWASP / CVE references; framework anchors in `cicd-impact/philosophy.md` | 2026-05-09 |
| "v0 competitor scorecard: analyzer-evaluation framework applied to ourselves and 7 competitors with real precision/recall data, maintenance, adoption stats, and honest losses (our distribution is ~1/1500 of the most-adopted competitor; competitor latency comparison is a v1 deliverable)" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) | ILB-Arena 2026-05-03 (40-vuln corpus); npm registry; published plugin documentation | 2026-05-09 |
| "Within-repo workflow cohort: same `ofri-peretz/eslint` repo, four workflows (`ci-pr.yml`, `lint-pr.yml`, `quality.yml`, `benchmark.yml`), four meaningfully-different unit costs ($0.48–$12.18/min) — confirms the framework differentiates by workflow shape. Reveals dog-food single-workflow figure was a lower bound: real per-developer-action cost is 2–3× higher when the gate-blocking quality.yml workflow is included" | [`cicd-impact/workflow-cohort-case-study.md`](cicd-impact/workflow-cohort-case-study.md) | Real `gh api` data from `ofri-peretz/eslint`, 180-day window, 4 workflows | 2026-05-09 |
| "Pre-registered seven falsifiable predictions (P1–P7) with frozen 2026-05-09 wording, horizons, and falsification signals — git-tag-ready (`predictions-v1-2026-05-09`); pre-registration discipline borrowed from OSF / Good Judgment Project" | [`cicd-impact/predictions-registry.md`](cicd-impact/predictions-registry.md) | Self-imposed scientific-replication discipline | 2026-05-09 |
| "v0 scorecard latency dimension measured: median wall-clock for 5 working competitor plugins on 30-file ILB corpus (sonarjs 559 ms · microsoft-sdl 523 ms · no-secrets 319 ms · no-unsanitized 312 ms · security-node 325 ms · baseline 453 ms). All comfortably under 1-s editor-loop threshold. **eslint-plugin-security@4.0.0 crashes on ESLint 9** with `context.getScope is not a function` — disqualified for functional currency on the current host-runtime major version" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level A | Direct measurement: ESLint 9.39.2, Node 24.12.0, 1 warmup + 3 timed runs; eslint-plugin-security stack trace from `npx eslint` invocation | 2026-05-09 |
| "Interlace measured at 1.02 ms/file on the same 40-file ILB corpus via programmatic ESLint API — tied with eslint-plugin-sonarjs on per-file latency (1.03 ms/file) but catches 2.7× more issues (43 vs 16). Closes the largest honest-loss in the v0 scorecard's latency dimension" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level B | Direct measurement: programmatic ESLint Linter API + CJS resolution shim ([`scripts/cjs-resolve-shim.cjs`](cicd-impact/scripts/cjs-resolve-shim.cjs)) + ESM loader hook ([`scripts/loader-hook.mjs`](cicd-impact/scripts/loader-hook.mjs)) + bench script ([`scripts/latency-bench.mjs`](cicd-impact/scripts/latency-bench.mjs)); 11 Interlace plugins fully loaded from built `dist/src/index.js` artifacts | 2026-05-09 |
| "Large-corpus measurement on real-world code (1,046-file lodash, ~50K LoC): Interlace's full 11-plugin security fleet at 0.94 ms/file is **2.0× faster than eslint-plugin-sonarjs (1 plugin) at 1.90 ms/file**, while catching **5.1× more issues** (1,351 vs 267). Plugins with low ILB-Arena F1 (eslint-plugin-security 0%, no-secrets 5%, no-unsanitized 5%) caught 0 issues on lodash — corroborating the 'adoption ≠ efficacy' finding on a real codebase, not just a synthetic corpus" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level C | Direct measurement on `node_modules/lodash`: programmatic ESLint Linter + CJS shim + ESM loader-hook + bench script with `--expose-gc` and heap-delta tracking | 2026-05-09 |
| "Signal-to-noise ratio measured on the matched ILB safe/vulnerable corpus (24+24 files): Interlace **41 fires on vulnerable / 5 fires on safe = 8.2 : 1 S/N**, vs eslint-plugin-sonarjs 26 / 18 = 1.4 : 1 (~6× lower). Sonarjs fires on **75% of safe files** — the canonical alert-fatigue pattern. eslint-plugin-security@4.0.0 produces **0 fires in either direction** on this corpus, confirming its 0% F1 from ILB-Arena on a different fixture set" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level D | Direct measurement on `benchmarks/corpus/{*,*}/safe` and `benchmarks/corpus/{*,*}/vulnerable` with `CORPUS_FILTER` env in `latency-bench.mjs` | 2026-05-09 |
| "Multi-corpus latency speedup is consistent at 2.0× — 3.1× across lodash / axios / jsdom / date-fns. Recall ratio is corpus-shape-dependent: 11.2× more findings than sonarjs on jsdom (security-heavy), 5.1× on lodash, 1.7× on axios, **0.5× on date-fns (sonarjs ahead — pure-functional date math has more code-quality issues than security issues)**. Honest loss preserved" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level E | Direct measurement on `node_modules/{lodash,axios,jsdom,date-fns}` with `CORPUS=` env in `latency-bench.mjs` | 2026-05-09 |
| "Per-rule TIMING attribution within Interlace on lodash: top hot rule `secure-coding/no-improper-type-validation` accounts for **26.5% of all rule-time** (140.8 ms / 532 ms total rule-time); top 5 rules account for ~45%. Optimisation roadmap is concrete and published — anyone can verify the math" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level F · [`cicd-impact/scripts/per-rule-timing.mjs`](cicd-impact/scripts/per-rule-timing.mjs) · [`cicd-impact/outputs/per-rule-timing.json`](cicd-impact/outputs/per-rule-timing.json) | Custom listener-wrapping instrumentation; 207 Interlace rules enabled simultaneously; lodash 1,046-file corpus | 2026-05-09 |
| "Cross-ESLint-version migration **closed 2026-05-13** (Open Item #6 in `value-philosophy.md` §6.5). At the 2026-05-10 audit, 140 of 217 Interlace rules used removed-in-v10 context APIs. On 2026-05-13 re-verification, `grep -rE 'context\.(getFilename\|getSourceCode\|getCwd)\(\)' packages/eslint-plugin-*/src/rules` returns **zero matches**; one residual reference exists as a code-comment in a single test file. `eslint10-compat-test.mjs` runs cleanly on the lodash 1,046-file corpus under ESLint 10.3.0 (0 parse errors, 875 issues, 0.76 ms/file). Same-class-of-break-as-eslint-plugin-security@4.0.0 symmetry is now restored — they crash, we don't" | [`cicd-impact/v0-competitor-scorecard.md`](cicd-impact/v0-competitor-scorecard.md) Dimension 3 Level G · [`cicd-impact/scripts/eslint10-compat-test.mjs`](cicd-impact/scripts/eslint10-compat-test.mjs) · [`cicd-impact/eslint10-migration-runbook.md`](cicd-impact/eslint10-migration-runbook.md) | Direct measurement: ESLint 10.3.0 from `benchmarks/suites/ilb-arena/eslint10-compat/node_modules/eslint`; source-grep against `packages/eslint-plugin-*/src/rules/`; full lodash-corpus run of `eslint10-compat-test.mjs`. CI regression guard alive: [`.github/workflows/eslint-version-matrix.yml`](.github/workflows/eslint-version-matrix.yml) | 2026-05-13 |

### Evaluation infrastructure (gap-closure)

These are operational-measurement claims — we don't merely *promise* to track these dimensions, we have running scripts that produce dated artifacts on demand or on a schedule. Each claim links to the closure artifact in `benchmark-results/` plus the generating script.

| Claim (as it appears in docs/marketing) | Artifact | Script + workflow | Last verified |
| --- | --- | --- | --- |
| "We track CVE-disclosure → rule-shipping latency in an append-only audit log, with a 14-day target for live-feed entries" | [`benchmark-results/cve-rule-latency.json`](benchmark-results/cve-rule-latency.json) + [`benchmark-results/cve-rule-latency.md`](benchmark-results/cve-rule-latency.md) | [`scripts/audit-cve-rule-latency.ts`](scripts/audit-cve-rule-latency.ts) + [`.github/workflows/cve-latency.yml`](.github/workflows/cve-latency.yml) (PR gate + nightly) | 2026-05-14 |
| "Every domain-security plugin's API-surface coverage is audited against the target SDK / runtime; floor 60% per plugin, currently 78% aggregate across 10 plugins" | [`.agent/api-surface-manifest.json`](.agent/api-surface-manifest.json) + [`benchmark-results/api-surface-coverage.md`](benchmark-results/api-surface-coverage.md) | [`scripts/audit-api-surface.ts`](scripts/audit-api-surface.ts) + [`.github/workflows/api-surface.yml`](.github/workflows/api-surface.yml) (PR gate, strict) | 2026-05-14 |
| "Per-rule p50/p95 latency budgets are CI-enforced; rules exceeding budget × (1 + tolerance) or the 1000 ms hard ceiling fail the build" | [`benchmarks/budgets/per-rule-p95.json`](benchmarks/budgets/per-rule-p95.json) + [`benchmark-results/per-rule-budget-check.md`](benchmark-results/per-rule-budget-check.md) | [`scripts/check-per-rule-budget.ts`](scripts/check-per-rule-budget.ts) + [`.github/workflows/per-rule-budget.yml`](.github/workflows/per-rule-budget.yml) (PR gate) | 2026-05-14 |
| "We snapshot the maintenance-health of every ESLint-plugin peer named in `ECOSYSTEM_LANDSCAPE.md` weekly (npm downloads, latest version, release cadence, days since release, stars, open issues, 90-day contributors)" | [`benchmark-results/peer-health.json`](benchmark-results/peer-health.json) + [`benchmark-results/peer-health.md`](benchmark-results/peer-health.md) | [`scripts/fetch-peer-health.ts`](scripts/fetch-peer-health.ts) + [`.github/workflows/peer-health.yml`](.github/workflows/peer-health.yml) (weekly Monday cron, auto-commit) | 2026-05-14 |
| "Peak RSS + cold-start time per engine + preset on a fixed corpus, with a CI-runner memory budget gate (80% of 7 GB)" | [`benchmark-results/resource-profile.json`](benchmark-results/resource-profile.json) + [`benchmark-results/resource-profile.md`](benchmark-results/resource-profile.md) | [`scripts/ilb-resource-profile.ts`](scripts/ilb-resource-profile.ts) | 2026-05-14 (infra shipped; first run on demand) |

## Honest losses (preserved)

These are measured outcomes where Interlace lost or didn't yet meet a goal. Per framework anti-pattern policy, we report and keep them visible:

| Statement | Where measured | Status |
| --- | --- | --- |
| "import-next is still 3.6x slower than the inline naive-DFS custom rule" | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) `kpiStatus.vsNaiveDFS` | Reported. Naive DFS is structural floor; closing the gap is roadmap Phase 7+ |
| "es-module-lexer Phase 5 ABANDONED — can't parse JSX" | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) `phases[4].status: "abandoned"` | Decision documented; no silent drop |

## Withdrawn claims (audit-driven, do not market)

These rows used to live under "Verified claims" but were removed during an audit because the cited evidence didn't support the headline number, or because the underlying corpus is self-authored in a way that doesn't survive an adversarial reading. Kept here as an audit trail — silently deleting a claim is worse than keeping the receipt.

| Withdrawn claim (do not use in marketing) | Cited evidence | Why withdrawn | Withdrawn on |
| --- | --- | --- | --- |
| "97.6% precision, 100% recall, 98.8% F1 on 40-vuln corpus" | [`benchmarks/results/ilb-arena/2026-05-03.json`](benchmarks/results/ilb-arena/2026-05-03.json) | The cited file's `summary.leaderboard[0]` reports Interlace at **100% precision / 100% recall / 100% F1** (40 TP / 0 FP / 0 FN). The 97.6 / 100 / 98.8 figures appear nowhere in the cited JSON, so the registry was asserting numbers neither it nor the evidence supports. The audit chose to withdraw rather than substitute 100% / 100% / 100% — a perfect score on a 40-fixture self-authored corpus is the textbook "regression test, not benchmark" failure mode and would not survive an adversarial reading. **The ordinal claim ("1st of 18 plugins tested, 17 security-relevant") is preserved above** — *relative* ranking on the same fixtures still informs a buyer even when absolute scores don't. | 2026-05-13 |
| "`import-next` is 100x faster than `eslint-plugin-import`" (also "up to 100x", "100x faster no-cycle", "100x faster cycle detection") | None — no result file in `benchmarks/results/` contains a 100x measurement | **The number was never measured.** The largest figure anywhere in the corpus is the synthetic **54.9x at 5,000 files** ([2026-01-02.json](benchmarks/results/ilb-perf-import-no-cycle/2026-01-02.json)); the real-codebase run tops out at **3.1x end-to-end / 8x rule-time**. 100x appears to be an extrapolation of the synthetic curve toward the 10K-file point that the same file records as **never run** (`note: "10K benchmark terminated - eslint-plugin-import would take 10+ minutes"`). An extrapolation is not a measurement. Docs surfaces also carried a fabricated supporting table (`15.0s → 0.15s`) whose two timings appear in no result file at all. **Replacement copy: "3.1x faster end-to-end and 8x faster in pure rule execution"**, the real-codebase figures already verified above. | 2026-08-02 |

### Remediation — the 100x claim on Dev.to (opened 2026-08-02, closed 2026-08-02)

In-repo surfaces are corrected and guarded by `npm run audit:claims` ([`scripts/check-withdrawn-claims.mjs`](scripts/check-withdrawn-claims.mjs), wired into `npm run quality`). Three surfaces were **outside this repo**. All three have been retitled upstream and carry an in-body correction note — titles re-verified live on 2026-08-02:

| Live article | Carried | Status |
| --- | --- | --- |
| [`...import-next-up-to-100x-faster-1afa`](https://dev.to/ofri-peretz/eslint-plugin-import-vs-eslint-plugin-import-next-up-to-100x-faster-1afa) | Title *and* URL slug | ✅ Retitled → *"eslint-plugin-import Spends 148s Finding Circular Deps in 5,000 Files. import-next Does It in 2.7s."* Body notes the 100x figure was a 10K-file projection, not a reading. **The slug is frozen** and still reads `100x-faster` — do not change it; the published link would break. |
| [`getting-started-with-eslint-plugin-import-next-51e6`](https://dev.to/ofri-peretz/getting-started-with-eslint-plugin-import-next-51e6) | Title + description ("reduce CI/CD times by up to 100x") | ✅ Retitled → *"no-cycle Is Commented Out in Your ESLint Config. Here Is the Two-Minute Swap That Turns It Back On."* Body cites the measured 54.8x at 5K files. |
| [`why-eslint-plugin-import-takes-45-seconds-and-how-we-fixed-it-2nmh`](https://dev.to/ofri-peretz/why-eslint-plugin-import-takes-45-seconds-and-how-we-fixed-it-2nmh) | Title ("the 100x Fix"); description claimed "45s to 0.4s" | ✅ Retitled → *"Why eslint-plugin-import Takes 58 Seconds on 10,000 Files — And Where the Time Actually Goes."* The `0.4s` figure was unmeasured too (real: 16.7s e2e / 4.9s rule time) and is now banned repo-wide by the `import-next-sub-second` pattern in the audit script. |

**Cross-link prose — corrected 2026-08-02.** Retitling the three articles above left the claim alive in a fourth place: *other* articles linking to them described the target as "up to 100x faster on large repos" in body prose. Three published articles carried it and were patched in place via the Dev.to API — link *targets* untouched, since the `/go/…-up-to-100x-faster` redirect slugs are frozen:

| Article | Was | Now |
| --- | --- | --- |
| [`…0-cycles-on-nextjs…-ln2`](https://dev.to/ofri-peretz/import-nextno-cycle-reported-0-cycles-on-nextjs-we-found-why-and-fixed-it-ln2) | "up to 100x faster on large repos" | 54.8x on `no-cycle` at 5K synthetic files; 8x rule time on a real 5,736-file codebase |
| [`…and-other-lies-caches-tell-you-3ld8`](https://dev.to/ofri-peretz/no-cycle-finds-0-cycles-in-nextjs-and-other-lies-caches-tell-you-3ld8) | "(up to 100x faster on large repos)" | same measured pair |
| [`…what-it-still-gets-wrong-c94`](https://dev.to/ofri-peretz/eslint-plugin-import-has-38m-weekly-downloads-heres-what-it-still-gets-wrong-c94) | link text "Up to 100x Faster →" | the target's real shipped title |

A fourth hit, [`…takes-58-seconds…-2nmh`](https://dev.to/ofri-peretz/why-eslint-plugin-import-takes-45-seconds-and-how-we-fixed-it-2nmh), was **left alone deliberately**: every `100x` / `0.4s` / `45s` string in it sits inside its own correction note, which exists to name those numbers as unmeasured. Its "58 seconds on 10,000 files" headline is measured — 58.67s, whole recommended config, [`ilb-perf-import/2026-01-02.json`](benchmarks/results/ilb-perf-import/2026-01-02.json). That is a *different* suite from the no-cycle-only one whose 10K point was never run; don't conflate them when auditing.

Swept 2026-08-02: **0 withdrawn claims in prose across all 84 articles returned by `articles/me/all`** — that endpoint includes drafts, which is why it exceeds the **79 published** articles mirrored into `articles.json`.

> **On 54.8x vs 54.9x.** The synthetic result file stores `"speedup": 54.9`, but its own measurements — 148.59s vs 2.71s — divide to **54.83x**. Public copy uses **54.8x** (the arithmetic); the stored 54.9 is a rounding artifact of the harness. Don't "correct" one to the other without reading this note.

**Article cache — resynced 2026-08-02.** `apps/docs/src/data/articles.json` is a **generated mirror** of `dev.to/api/articles/me/all`; never hand-edit it, because the next sync reverts the edit. It had drifted badly (38 cached vs 79 live, 35 stale titles) and was still advertising the three withdrawn headlines. Re-run against the authenticated endpoint, it now carries the corrected titles. The only surviving `100x` strings are the article's frozen `url`, `canonical_url`, and `cover_image` filename — **these must not be changed; the published link would break.**

Run the sync the way CI does — [`docs-data.yml`](.github/workflows/docs-data.yml) and `npm run devto:sync-articles` both use [`update-articles-data.ts`](apps/docs/scripts/update-articles-data.ts) with **`DEV_TO_API_KEY`**:

```bash
DEV_TO_API_KEY=... npx tsx apps/docs/scripts/update-articles-data.ts
```

Two traps, both live:

- **Always run it authenticated.** The unauthenticated endpoint omits `page_views_count` and the script coerces it to `0` — an anonymous run silently zeroes every view count in the mirror. Confirm `🔑 Source: authenticated API` in the output.
- **`apps/docs/scripts/update-articles.ts` was a dead second writer** of the same file, keyed off a *differently spelled* `DEVTO_API_KEY`. Referenced by no workflow and no npm script, so it was deleted (2026-08-04) rather than kept in sync with the idempotent-write change. `update-articles-data.ts` is the only writer.

The `†`-marked rows in [`distribution/PUBLISHING_QUEUE.md`](distribution/PUBLISHING_QUEUE.md) have been updated to the retitled headlines: that file logs what is published, and what is published is now the corrected title.

## Pending claims (require new suites)

| Claim | Required suite | Status |
| --- | --- | --- |
| "Lower false-positive rate than eslint-plugin-security" | ilb-arena (already covers) | Verified — see ilb-arena 2026-05-03.json `plugins.eslint-plugin-security.scores.precision` |
| "First-fix accuracy improvement from V2 formatter" (Phase 7 of report) | New: `ilb-formatter-eval` (LLM eval harness) | Not started — see [no-cycle-performance-roadmap.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/no-cycle-performance-roadmap.md) |
| "Compact-mode tokens are 6% cheaper than V1" | Token-counter test | Verified statically (tiktoken o200k) — see Phase 7 of [2026-05-03-snappy-dashboard.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/2026-05-03-snappy-dashboard.md) — needs JSON capture |
| "Native ESLint 9 concurrency speedup" | Future ilb-perf-eslint9 suite | Not started; depends on ESLint 9 migration |
| "Synthetic-corpus speedup at ≥10K files" (the number the withdrawn 100x claim was extrapolating toward) | In-repo `ilb-perf-import-shapes` harness — **now exists** (2026-08-02): generator + runner + methodology, reproducible from committed source. A ≥10K-file run is still outstanding | Harness done, 10K run not started. Until that run exists, no synthetic figure above 54.9x may be marketed, and the 2026-01-02 synthetic numbers cannot be refreshed. Budget note: the 2026-01-02 file records that `eslint-plugin-import` needs 10+ min per 10K-file iteration, so a 3-iteration baseline is ~30 min of wall clock — and on a deep-chain shape it will not finish at all, it crashes. |

## How to add a new claim

1. **Don't write the marketing copy first.** Build (or extend) the benchmark first; ensure it produces a measurable result for our plugin and at least one competitor.
2. Add a row to "Verified claims" above with: claim text, suite name, latest result link, today's date.
3. Add the marketing copy to docs / home page.
4. (Recommended) cross-link from the docs page to the benchmark result so curious readers can audit.

## How to refresh a claim

1. Re-run the benchmark from `eslint/benchmarks/`.
2. Commit the new dated JSON in `benchmarks/results/<suite>/`.
3. Bump the "Last verified" date in this table.
4. If a number changed (we won, we lost, scores moved), update the docs copy to match — never let docs and benchmarks disagree.

## Refusing claims

The repo policy (per evidence framework) is: **claims without rows here are not allowed in docs.** When tempted to add unbacked copy, route the instinct into a row in "Pending claims" instead and queue the suite that would back it.
