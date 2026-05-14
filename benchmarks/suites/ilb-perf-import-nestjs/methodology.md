# `ilb-perf-import-nestjs` — Methodology

Sibling of [`ilb-perf-import`](../ilb-perf-import/methodology.md), with
the same protocol but a single real-codebase corpus (nestjs) instead
of generated fixtures.

## Per-run protocol

For each competitor:

1. **Warmup** — 1 run, discarded.
2. **Timed runs** — 3 runs, `.eslintcache` cleared between each.
3. **TIMING** — `TIMING=all` is set for every run; per-rule self-time
   is averaged across the 3 timed runs.
4. **Memory** — `process.resourceUsage().maxRSS` captured in the
   worker process for each run; max across runs is reported.

The worker is a generated TS file (under `.workers-ilb-perf-import-nestjs/`)
that loads the competitor's config via dynamic `import()`, instantiates
`new ESLint({...})`, calls `lintFiles(<file list>)`, and prints one
JSON line to stdout. The parent (`run.ts`) times the worker's spawn-to-
exit window with `Date.now()`.

## Sources of jitter

Controlled for:

- `.eslintcache` cleared between runs
- Plugin source pinned (workspace symlink to local package)

Not controlled for:

- macOS Spotlight indexing — pause during runs for tightest CV
- File system cache warmth — the warmup partially cancels this
- CPU thermal throttling on long sessions

The **CV column** flags uncontrolled jitter. A run with CV > 5% is
surfaced in the report's "CV gate" section; rerun if you see one.

## Detection-parity gate

Both plugins are configured to enable only the `no-cycle` rule.
On a real codebase, they should report nearly-identical cycle counts.
If they disagree by more than **5%**, the JSON is marked
`parityWarning: true` and the report calls it out — a perf comparison
between plugins detecting different cycles is not apples-to-apples.

Small diffs are expected (different resolver behavior on edge cases
like TS path aliases, dynamic imports, `.d.ts` walks). Large diffs
indicate a real semantic mismatch and should be investigated before
trusting the speedup number.

## Reproducibility

- Corpus commit pinned in `competitors.json` → `corpus.commit`.
- Clone is shallow (`--depth 1 --branch <commit>`) for speed; falls
  back to depth-50 + checkout if the ref is a SHA, not a branch/tag.
- Both plugin versions pinned in `competitors.json` → `competitors[].version`.

To re-pin the corpus, bump the `commit` field, delete the cached
clone (`rm -rf ~/repos/ofriperetz.dev/oos/nestjs`), and rerun.
