# `ilb-perf-import` — Methodology

> Performance benchmark for `eslint-plugin-import-next` rules vs incumbents.
> Two harnesses share this suite: synthetic-corpus and real-codebase.
> Schema: [agents/interlace/evidence-framework.md](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).

## Harnesses

### 1. Synthetic corpus (in-tree, reproducible)

- **Runner:** `eslint/benchmarks/scripts/run-benchmark.js` invoked with the configs in [`configs/`](./configs/)
- **Corpus:** generated fixtures (1K, 5K, 10K files)
- **Result file pattern:** `eslint/benchmarks/results/ilb-perf-import-no-cycle/<date>.json`
- **Use when:** measuring isolated rule cost without consumer-codebase noise

### 2. Real-codebase (out-of-tree, more realistic)

- **Runner:** [`scripts/benchmark-circular-deps.mjs`](https://github.com/ofri-peretz/snappy-client-dashboard/blob/main/scripts/benchmark-circular-deps.mjs) at the consumer repo
- **Corpus:** the consumer's actual `src/` (e.g. snappy-client-dashboard: 5,736 files / 455K LoC)
- **Result file pattern:** `eslint/benchmarks/results/ilb-perf-import-no-cycle/<date>-<corpus-name>.json`
- **Use when:** validating that synthetic-corpus wins translate to real-world workloads

## Comparison set

5 ESLint configs, declared in [`competitors.json`](./competitors.json) — see that file for the full table. Each maps to one `.config.js` under [`configs/`](./configs/).

The "custom naive DFS" entry is included as the **structural floor** — zero plugin abstraction, ~0.15ms per resolution call. We don't expect to beat it (it's bespoke to one codebase and skips publishable concerns), but it tells us how much of our overhead is irreducible vs addressable.

## Per-run protocol

For each config:

1. **Warmup** — 1 run, discarded
2. **Timed runs** — 3 runs, ESLint cache cleared between each
3. **TIMING run** — separate run with `TIMING=1` env var, capture per-rule breakdown
4. **Memory** — 1 run with `/usr/bin/time -l`, capture peak RSS

**Flags:** `--quiet`, `--no-error-on-unmatched-pattern`, `--ext .ts,.tsx,.js,.jsx`

**Sources of jitter we control for:**

- Cache state (cleared between runs)
- Background system load (advise: close other heavy processes)
- ESLint daemon state (none — fresh subprocess per run)

**Sources of jitter we don't control for:**

- macOS Spotlight indexing (advise: pause during run)
- File system cache warmth (warmup helps but doesn't fully cancel)
- CPU thermal throttling on long sessions

The CV column in the statistical-summary table catches uncontrolled jitter. Rule out a run if its CV exceeds 5%.

## What we report

For each competitor, every dated JSON includes:

- **Wall-clock** — median, mean, stddev, individual run timings
- **Per-rule TIMING** — extracted from `TIMING=1` output
- **Peak RSS** — from `/usr/bin/time -l`
- **Detection parity** — error counts (must match across configs to validate fairness)
- **Composite score** — normalized [0, 1], higher is better

## Phase tracking (for the no-cycle rule)

The May 3rd 2026 snappy-dashboard run captured 6 optimization phases in a single dated JSON's `phases` array. Future per-phase work re-runs the suite and commits a NEW dated JSON; the `phases` array preserves the trajectory.

Strategy-level commentary, root-cause analysis, and performance roadmap live alongside in:

- [agents/interlace/eslint/benchmarks/2026-05-03-snappy-dashboard.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/2026-05-03-snappy-dashboard.md) — narrative companion
- [agents/interlace/eslint/benchmarks/no-cycle-performance-roadmap.md](https://github.com/ofri-peretz/agents/blob/main/interlace/eslint/benchmarks/no-cycle-performance-roadmap.md) — phase 7+ roadmap

The JSON is the source of truth; markdown is the readable view.

## Honest losses

This suite preserves measured losses, including:

- **Phase 5 ABANDONED** — `es-module-lexer` (WASM) can't parse JSX/TSX. With 42% TSX in snappy, the dependency couldn't ship. Documented in `phases[].status: "abandoned"`.
- **vs naive DFS** — Phase 6 still 3.6x slower than the inline custom rule. KPI not met. Carried forward as a Phase 7+ goal rather than buried.

If a future "fix" silently drops a dimension where we lose, that's a benchmark regression — the framework forbids it.
