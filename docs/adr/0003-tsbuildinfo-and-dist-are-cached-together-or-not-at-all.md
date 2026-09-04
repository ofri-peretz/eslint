# ADR 0003 — `.tsbuildinfo` and `dist` are cached together, or not at all

- **Status:** accepted
- **Date:** 2026-09-01
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/ci-speed/`](../intents/ci-speed/intent.md)

## Context

`.github/actions/setup` cached `packages/*/.tsbuildinfo` and, deliberately, not
`packages/*/dist`. The stated reason was sound: `dist` is hundreds of MB, and
this repo has history with a cache store reaching **36.89 GB against a 10 GB
budget**, where GitHub LRU-evicts entries and a perfectly good `restore-keys`
prefix finds nothing to fall back on. A small entry survives; a fat one is an
evicted one.

Splitting the pair is nonetheless incoherent. `tsgo --build` reads the
buildinfo, concludes every project is up to date, and **skips emitting** — so
the `.d.ts` files downstream projects reference are never written.

The failure surfaced as a type error in a file nobody had touched:

```
packages/eslint-plugin-jwt-security/src/utils/index.ts(560,6):
error TS7006: Parameter 'prop' implicitly has an 'any' type.
```

Reproduced exactly by building the graph, deleting only `dist`, and rebuilding:

```
TS2307: Cannot find module '@interlace/eslint-devkit' or its corresponding
        type declarations
TS7006: Parameter 'context' implicitly has an 'any' type
```

The removed cache step's own comment asserted that "a stale buildinfo is safe
by construction — tsgo re-checks every project whose inputs no longer match".
That is true of stale **inputs** and false of absent **outputs**, and the gap
between those two cost a diagnosis that started three packages from the cause.

## Decision

Cache neither. The pair is the unit, and the unit is too big for the budget.

Cold `tsgo --build` over the whole graph is a measured **25s**, paid in a job
that runs in parallel with the rest of the gate.

## Consequences

- Typecheck pays ~25s every run instead of ~0s on a warm cache. Accepted:
  correctness is not worth 25s.
- The failure mode it removes is worse than the time it costs — a type error
  attributed to innocent code, in a file the branch never touched.
- `scripts/__tests__/tsbuildinfo-cache-pairing-lock.test.ts` asserts the
  **invariant**, not today's choice: neither cached is fine, both cached is
  fine, exactly one is the bug. It ignores comments, or the rationale above
  would read as a violation and the lock would fail green.

## Alternatives considered

**Cache both.** Correct, and rejected on the documented eviction history.

**Cache declarations only (`dist/**/*.d.ts`).** Smaller, and plausible. Not
taken because `tsgo --build` checks output freshness, so a missing `.js`
alongside a present `.d.ts` may trigger a rebuild anyway — which would spend
the cache's complexity for none of its benefit. Worth measuring if the 25s ever
lands on the critical path.

---

## Correction, 2026-09-03 — the size premise was wrong, and it cost the incremental build

This ADR's rule is right and stands: `.tsbuildinfo` and `dist` are one unit.

Its _reason for caching neither_ was wrong. The text cites `dist` as "hundreds
of MB" and a cache store that "once took this repo to **36.89 GB** against a
10 GB budget". That 36.89 GB was **turbo's own append-only local cache** — the
one the setup action prunes, documented a few lines away in the same file. It
was not `dist`. Two different caches, one number, and the wrong one was cited.

Measured across all 32 packages with a build:

| path                      |                               size |
| :------------------------ | ---------------------------------: |
| `packages/*/dist`         |                         **9.0 MB** |
| `packages/*/.tsbuildinfo` |                             3.5 MB |
| the pair                  | **12.5 MB** — 0.125% of the budget |

The consequence of dropping both: `npm run typecheck` runs
`tsgo --build tsconfig.solution.json` over composite projects that every one of
them configures with `tsBuildInfoFile`. The repo is set up for incremental
whole-graph typechecking and CI discarded the state it needs, so it ran cold on
every PR — ~62s of re-deriving what the previous run already knew.

**Both halves are cached again, as one entry**, restored on branches and saved
on `main`. `tsbuildinfo-cache-pairing-lock.test.ts` is unchanged and still the
thing that makes splitting them fail — it was never the problem.
