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

## Graph-shape matrix (`ilb-perf-import-shapes`)

The synthetic corpus above is a single graph shape — a deep linear chain — which
is the best case for a plugin that amortizes traversal across files. A win there
says nothing about shapes with nothing to amortize. This matrix holds file count
at 5,000 and varies only the shape, so "faster than the official plugin" can be
claimed over a range instead of over one favourable graph.

| Shape | Structure | What it stresses |
|-------|-----------|------------------|
| `chain-5000` | `file[i] → file[i-1]`, `file[i-5]`; depth ≈ 5,000 | Deep traversal. Heavily amortizable — our best case. |
| `wide-5000` | 5,000 leaves over a 20-module core; depth 2 | Nothing to amortize; per-file setup cost is the whole story. |
| `flat-5000` | No local imports | Fixed per-file overhead, isolated from traversal cost. |
| `dense-5000` | 1,000 mutually-importing clusters of 5 | Maximum distinct SCCs; the cycle-reporting path dominates. |
| `single` | One file importing one other | Cold editor-on-save; a shared cache has one file to amortize over. |

Generate with `node scripts/generate-fixtures.js shapes`, run with
`node scripts/run-benchmark.js ilb-perf-import-shapes --iterations=3`.

### Gates

Detection parity is checked per shape before any timing is trusted. A speed
number from a run that reported different cycles than the official plugin is
meaningless.

**The gate is manual, not enforced by the runner.** `runner.js` records only
`times`, `stats`, `failed` and `reason` — it does not capture violation counts,
so nothing in the result JSON proves parity held for a given run. The counts
below were verified by hand on 2026-08-02 with `eslint -f json` per shape. Until
the runner records them, treat parity as an operator responsibility and re-check
it whenever fixtures are regenerated. Verified counts: `flat` 0/0, `wide` 0/0, `dense` 20,000/20,000,
`single` 0/0. `chain` cannot be compared — the official plugin crashes on it.

A run that fails is recorded as `failed` with a reason, never as a duration, and
any speedup involving it is `null`. This matters more than it sounds: a plugin
that crashes partway through exits *early*, so timing a crash scores it as fast.
The bias only ever runs one way — toward flattering whichever plugin fails
sooner.

### Two traps this suite has already hit

**Fixture paths.** `generate-fixtures.js` wrote to `benchmarks/<name>/fixtures`
while `run-benchmark.js` read `suites/<suite>/fixtures`, and the generator keyed
directories by generator name (`import`) rather than suite name
(`ilb-perf-import`). Both are fixed. Before the fix the synthetic suite could not
be regenerated from committed source at all.

**stdout buffering reads as a timeout.** `execSync` buffers stdout with a 1 MB
default `maxBuffer`. `dense-5000` emits 20,000 report lines, overruns it, and
Node kills the child with SIGTERM — indistinguishable from the 300s timeout.
Both plugins were recorded as ">300s" when both actually finish in under 4s.
stdout is now discarded; only exit status and stderr are captured.

### Reporting statistics

Report **medians**, not means, and state `n`. On `wide-5000` the official plugin
produced a 6.05s outlier against a 2.81s median, which dragged its mean to 3.70s
and inverted the verdict — one run read as "we are 0.9× slower" purely from that
outlier. Interleave the two plugins within each round so monotonic drift (thermal
throttling, background load) cancels rather than accruing to whichever ran second.
