# `benchmark-results/` — Live Benchmark Output

This directory holds the **latest** results from every benchmark suite. Per-suite history (`history.ndjson`) is append-only; everything else gets overwritten on the next run.

> **Authoritative meaning of every metric** lives in [`../benchmarks/README.md`](../benchmarks/README.md) — the philosophy + vocabulary contract. If a number here looks wrong, that doc is the single source of truth.
>
> **Agent-queryable status snapshot** lives in [`../benchmarks/state.json`](../benchmarks/state.json), which references the files here as their canonical paths.

## Top-level outputs

| File | Source | What it answers |
| :--- | :--- | :--- |
| [`scorecard.md`](./scorecard.md) | `npm run ilb:scorecard` | The headline ranking across every suite — start here |
| [`leaderboard.md`](./leaderboard.md) / `.json` | `npm run ilb:leaderboard` | Plugin-vs-plugin head-to-head |
| [`cwe-coverage.md`](./cwe-coverage.md) / `.json` / `cwe-coverage-gaps.md` | `npm run ilb:cwe` | CWE coverage vs OWASP frameworks |
| [`iso25010-crosswalk.md`](./iso25010-crosswalk.md) / `.json` | `npm run ilb:iso25010` | Quality model crosswalk |
| [`compliance-crosswalk.md`](./compliance-crosswalk.md) / `.json` | `npm run ilb:compliance` | Compliance framework crosswalk |
| [`federated-wild.md`](./federated-wild.md) / `.json` | `npm run ilb:federated` | Wild-corpus federated aggregation |
| [`differential.md`](./differential.md) | `npm run ilb:diff` | Diff between two scorecard runs |
| [`provenance.md`](./provenance.md) | `npm run ilb:provenance` | Bench provenance / corpus integrity |
| [`baseline.json`](./baseline.json), [`baseline-llm.json`](./baseline-llm.json) | manual capture | Reference numbers the regression gates compare against |
| [`history.ndjson`](./history.ndjson) (+ `.meta.json`) | every successful bench run | Append-only history, plotted across time |
| `eslint-version-stats.json` | `npm run stats:eslint-versions` | npm download share by ESLint major (drives the support policy) |

## Dated subdirectories

When a run produces a snapshot worth pinning, it lands at `benchmark-results/<YYYY-MM-DD>/`. Treat these as immutable evidence — don't edit, don't delete.

## Rotation policy

There is no automated rotation today. When this directory grows past ~50 dated snapshots, archive the oldest into a separate `archive/` subdirectory or move them into `benchmarks/audits/`. Active monthly snapshots + `history.ndjson` are sufficient to plot trends.

## Conventions

- Every result file MUST be regenerable from a single npm script — no manual editing.
- Markdown views are derived from JSON. If the markdown disagrees with the JSON, the JSON wins.
- Every claim in [`../CLAIMS.md`](../CLAIMS.md) cites a file here. If a result file disappears, its dependent claim becomes stale.
