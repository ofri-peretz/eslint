# Interlace Lint Bench (ILB) — Naming & Methodology

**Status:** v1.0 — adopted 2026-05-03

The Interlace benchmark suite uses the `ILB-*` naming convention. Each bench
measures **one dimension** and produces **one comparable score**. Methodology
is versioned (`v1.0`) so corpus or scoring changes invalidate prior results
explicitly rather than silently.

---

## The seven benches

| Short | Full name | Dimension | Score | Industry parallel | Suite location |
|---|---|---|---|---|---|
| ILB-Juliet | Interlace Juliet | Synthetic CWE detection accuracy | F1 (Wilson 95% CI) | NIST SARD/Juliet, OWASP Bench | `corpus/CWE-*/`, `benchmarks/ilb-juliet/` |
| ILB-Arena | Interlace Arena | Head-to-head vs competitor plugins | F1 leaderboard rank, OWASP BAS | OWASP Benchmark Accuracy Score | `benchmarks/ilb-arena/`, `benchmarks/ilb-arena-quality/` |
| ILB-Wild | Interlace Wild | Findings on popular OSS (pinned commits) | findings/kLoC + plugin coverage% | (none — we define it) | `scripts/ilb-wild.mjs` |
| ILB-Edge | Interlace Edge | FP resilience on adversarial-real codebases | FP rate | Adversarial GLUE / CheckList | `scripts/ilb-wild.mjs --fp-corpus` |
| ILB-Perf | Interlace Perf | Lint throughput + memory | ms/file (median 3 runs) + peak RSS | MLPerf, SPEC CPU | `benchmarks/ilb-perf-import/`, `scripts/ilb-wild.mjs` |
| ILB-Cov | Interlace Coverage | % rules that fire across the corpus | rule activation rate | (analogous to mutation testing) | derived from ILB-Wild + ILB-Juliet |
| ILB-AI | Interlace AI | Vulnerability detection on LLM-generated code | vuln-detection rate (Wilson CI) | HumanEval / SWE-Bench (task design) | `benchmarks/ilb-ai/` |
| ILB-LLM-Tokens | Interlace LLM Tokens | Formatter output token cost | mean delta vs V1 across fixtures, % (o200k_base) | (we define it — `tiktoken` reproducibility benchmarks closest) | `benchmarks/suites/ilb-llm-tokens/` |
| ILB-LLM-Fix | Interlace LLM Fix Accuracy | First-fix pass rate when LLM consumes formatter output | macro pass rate across (variant, model) | HumanEval / SWE-Bench (task design only) | `benchmarks/suites/ilb-llm-fix/` |

---

## Conventions

**Versioning.** Every bench has a methodology version (`v1.0`). Bumping the corpus,
the scoring formula, or the runner protocol bumps the version. Cross-version
comparisons must say so explicitly: *"ILB-Wild v1.0 vs v1.1: corpus expanded
from 13 to 17 repos."*

**Frozen corpus per version.** Pinned commits, fixed prompts, deterministic seeds.
A v1.0 result must be reproducible from a v1.0 corpus snapshot.

**Single-number score.** Each bench reduces to one comparable number for the
top-line scorecard. Everything else is breakdown / drill-down.

**Industry parallel cited.** Where a published standard exists (Juliet, OWASP
Benchmark, MLPerf), we mirror its conventions. Where none exists (Wild, Edge),
we say so and define our own — rather than claiming to follow a standard that
doesn't apply.

---

## Score formulas

### ILB-Juliet — F1 with Wilson 95% CI

Standard precision/recall/F1 on the CWE-mapped corpus:

```text
precision = TP / (TP + FP)
recall    = TP / (TP + FN)
F1        = 2·(precision·recall) / (precision + recall)
```

Plus the OWASP Benchmark Accuracy Score for free credibility:

```text
BAS (Youden's J) = TPR − FPR
```

CIs computed via Wilson Score (see `BENCHMARK_GUIDELINES.md` §A.3).

### ILB-Arena — F1 leaderboard rank

Same per-rule metrics as ILB-Juliet, but reported as a rank table across N
competitor plugins on the same fixture set. Adopt OWASP Benchmark's
Truth-Table-per-CWE format so security tool buyers read familiar layouts.

### ILB-Wild — findings density + coverage

```text
findings_density = total_findings / (kLoC of corpus)
plugin_coverage  = rules_fired / total_rules_in_plugin
```

Both reported per-plugin per-repo, plus an aggregate. No claim of
TP/FP/FN — those require ground truth, which we don't have on real OSS.
Wild measures *exposure*, not accuracy.

### ILB-Edge — FP rate

Curated corpus of repositories that **legitimately use risky patterns**
(e.g., Three.js's `eval` for shaders, Webpack's HMR `eval`). Every finding
is presumed FP until manually annotated as TP.

```text
fp_rate = unannotated_findings / total_findings
```

Lower is better. Per-rule attribution lets us fix the offender directly.

### ILB-Perf — ms/file median + peak RSS

```text
ms_per_file = median(3 runs) of (wall_clock_ms / file_count)
peak_rss    = max RSS across the 3 runs (in MB)
```

Three scenarios:

- **cold** — no cache, no warmup
- **warm** — post-warmup, cache cleared
- **incremental** — single-file change, cache warm

### ILB-Cov — rule activation rate

```text
activation_rate = (rules with ≥1 finding across corpus) / total_rules
```

Computed from ILB-Wild and ILB-Juliet outputs. Surfaces dead rules and
under-tested coverage.

### ILB-AI — vulnerability detection rate

Existing methodology in `benchmarks/ilb-ai/`. Wilson CI on detection
rate per (model × prompt category). χ² test for inter-model significance.

---

## CLI entry points

```bash
npm run ilb:wild              # ILB-Wild — popular OSS (default: all repos)
npm run ilb:wild -- --list    # show target matrix
npm run ilb:wild -- --repo three.js   # single repo
npm run ilb:edge              # ILB-Edge — adversarial-real subset only
npm run ilb:juliet            # ILB-Juliet — synthetic CWE
npm run ilb:arena             # ILB-Arena — head-to-head security
npm run ilb:arena:quality     # ILB-Arena (quality variant)
npm run ilb:perf:import       # ILB-Perf — import plugin throughput
npm run ilb:ai                # ILB-AI — LLM-generated code
npm run ilb:llm:tokens        # ILB-LLM-Tokens — formatter token cost (no API calls)
npm run ilb:llm:fix           # ILB-LLM-Fix — formatter first-fix accuracy (calls Claude CLI)
npm run ilb:scorecard         # cross-bench scorecard (reads latest from each)
npm run ilb:regression        # gate against benchmark-results/baseline.json
```

CI gate: `.github/workflows/benchmark.yml` — runs ILB-Wild on a smoke subset
on every PR touching plugins or scripts, and posts the scorecard as a PR
comment. Bump the baseline locally with `npm run ilb:regression -- --update-baseline`.

---

## Reports the suite produces

Per `ilb:wild` run:

```text
benchmark-results/<date>/
├── summary.json              # exec summary across all repos
├── summary.md                # shareable markdown leaderboard
└── per-repo/
    └── <repo>/
        ├── run.json          # raw 3-run timings + median/stddev
        ├── per-rule.json     # ruleId → {timeMs, hits, samples[]}
        ├── findings-sample.json  # top 50 violations (file, line, code)
        └── report.md         # adoption-ready per-repo report
```

The `ilb:scorecard` command rolls latest results from every bench into a
single page (`benchmark-results/scorecard.md`) — the artifact we share.

---

## Adding a new bench

1. **Single dimension only.** If it measures two things, it's two benches.
2. **Single-number top-line score.** Comparable across versions.
3. **`ILB-<short>` + version.** `ILB-Watch v1.0`, etc.
4. **Industry parallel cited or "we define this."** No false claims.
5. **Frozen corpus per version.** Bump the version when corpus changes.
6. **Documented in this file** before adding the runner.
