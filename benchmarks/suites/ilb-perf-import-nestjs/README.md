# `ilb-perf-import-nestjs` — head-to-head no-cycle on nestjs

Wall-clock + RSS + per-rule timing comparison of:

- `eslint-plugin-import` (no-cycle)
- `eslint-plugin-import-next` (no-cycle)

Run against the nestjs OSS codebase (~596 TS files, ~42K LoC).

## Quick start

```bash
# from repo root
cd benchmarks
npm run ilb:perf-import-nestjs
```

First run shallow-clones nestjs to `~/repos/ofriperetz.dev/oos/nestjs/`
(or `$ILB_OOS_DIR` if set). Subsequent runs reuse the cache.

You must build `eslint-plugin-import-next` first — the suite imports
its compiled artifact from `dist/`:

```bash
cd packages/eslint-plugin-import-next && npm run build
```

## Latest results

_(TBD — populated by the first `npm run ilb:perf-import-nestjs` run.
See [`benchmarks/results/ilb-perf-import-nestjs/`](../../results/ilb-perf-import-nestjs/) for dated JSON + markdown reports.)_

## Output

Each run writes two files to `benchmarks/results/ilb-perf-import-nestjs/`:

- `<YYYY-MM-DD>.json` — full structured results (machine-readable)
- `<YYYY-MM-DD>.md` — human-readable report (mirrors the format of
  `benchmark-results/<date>/per-repo/<repo>/report.md` produced by
  `scripts/ilb-wild.ts`)

## What we report

| Metric | Source |
|---|---|
| Wall-clock (median, mean, stddev, CV) of 3 timed runs | `Date.now()` deltas around worker spawn |
| Peak RSS | `process.resourceUsage().maxRSS` in the worker process |
| Per-rule self-time | `TIMING=all` table (parsed from worker stderr/stdout) |
| Cycle count (detection parity) | ESLint message count for the rule |
| Speedup | `import.medianMs / import-next.medianMs` |
| Parity warning | Fires if cycle counts differ by >5% |

## Methodology

See [`methodology.md`](./methodology.md) — same protocol as the parent
[`ilb-perf-import`](../ilb-perf-import/) suite, with the nestjs corpus
substituted for generated fixtures.

## Files

```
ilb-perf-import-nestjs/
├── README.md           # this file
├── methodology.md      # protocol & gates
├── competitors.json    # corpus + competitor declarations
├── run.ts              # entrypoint (npm run ilb:perf-import-nestjs)
└── configs/
    ├── import-no-cycle.config.js
    └── import-next-no-cycle.config.js
```

## Swapping corpus

Edit `competitors.json` → `corpus`:

```json
{
  "corpus": {
    "name": "your-repo",
    "repo": "https://github.com/owner/repo.git",
    "commit": "v1.0.0",
    "srcGlob": "src/**/*.ts"
  }
}
```

The clone helper (`benchmarks/lib/clone-repo.ts`) handles the rest.
