# Claims Registry — `@interlace/eslint-plugin-*`

> Every marketing claim in this repo's docs and home page is mapped here to its evidence file. Format mandated by the [Interlace Evidence Framework](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).
>
> If a claim doesn't have a row, it can't ship in the docs. If "Last verified" is older than 90 days, the claim is **stale** and gets a "verification pending" banner in docs until refreshed.
>
> Sister registry: [`serverless/CLAIMS.md`](https://github.com/ofri-peretz/serverless/blob/main/CLAIMS.md).

## Verified claims

### Security detection (ilb-arena suite)

| Claim (as it appears in docs/marketing) | Suite | Latest result | Last verified |
| --- | --- | --- | --- |
| "97.6% precision, 100% recall, 98.8% F1 on 40-vuln corpus" | ilb-arena | [2026-05-03.json](benchmarks/results/ilb-arena/2026-05-03.json) | 2026-05-03 |
| "1st place vs 17 ecosystem plugins" | ilb-arena | [2026-05-03.json](benchmarks/results/ilb-arena/2026-05-03.json) | 2026-05-03 |
| "Next-best plugin scores 66.1% F1 (eslint-plugin-jsdoc)" | ilb-arena (relative ranking) | [2026-05-03.json](benchmarks/results/ilb-arena/2026-05-03.json) | 2026-05-03 |

### Performance — circular dependency detection (ilb-perf-import-no-cycle suite)

| Claim (as it appears in docs/marketing) | Suite | Latest result | Last verified |
| --- | --- | --- | --- |
| "import-next is 3.1x faster end-to-end than eslint-plugin-import on a 5,483-file React codebase" | ilb-perf-import-no-cycle (real-codebase: snappy-dashboard) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "8x faster in pure rule execution time" | ilb-perf-import-no-cycle | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Cycle detection completes in ~4.9s on 455K LoC" | ilb-perf-import-no-cycle (Phase 6 ruleTimeMs) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Negligible memory overhead (<50 MB)" | ilb-perf-import-no-cycle (peakRssMb) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "100% detection parity with official plugin" | ilb-perf-import-no-cycle (detection accuracy) | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) | 2026-05-03 |
| "Synthetic-corpus 25.7x speedup at 1K files" | ilb-perf-import-no-cycle (synthetic) | [2026-01-02.json](benchmarks/results/ilb-perf-import-no-cycle/2026-01-02.json) | 2026-01-02 (re-verify recommended — > 90 days) |

## Honest losses (preserved)

These are measured outcomes where Interlace lost or didn't yet meet a goal. Per framework anti-pattern policy, we report and keep them visible:

| Statement | Where measured | Status |
| --- | --- | --- |
| "import-next is still 3.6x slower than the inline naive-DFS custom rule" | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) `kpiStatus.vsNaiveDFS` | Reported. Naive DFS is structural floor; closing the gap is roadmap Phase 7+ |
| "es-module-lexer Phase 5 ABANDONED — can't parse JSX" | [2026-05-03-snappy-dashboard.json](benchmarks/results/ilb-perf-import-no-cycle/2026-05-03-snappy-dashboard.json) `phases[4].status: "abandoned"` | Decision documented; no silent drop |

## Pending claims (require new suites)

| Claim | Required suite | Status |
| --- | --- | --- |
| "Lower false-positive rate than eslint-plugin-security" | ilb-arena (already covers) | Verified — see ilb-arena 2026-05-03.json `plugins.eslint-plugin-security.scores.precision` |
| "First-fix accuracy improvement from V2 formatter" (Phase 7 of report) | New: `ilb-formatter-eval` (LLM eval harness) | Not started — see [no-cycle-performance-roadmap.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/no-cycle-performance-roadmap.md) |
| "Compact-mode tokens are 6% cheaper than V1" | Token-counter test | Verified statically (tiktoken o200k) — see Phase 7 of [2026-05-03-snappy-dashboard.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/2026-05-03-snappy-dashboard.md) — needs JSON capture |
| "Native ESLint 9 concurrency speedup" | Future ilb-perf-eslint9 suite | Not started; depends on ESLint 9 migration |

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
