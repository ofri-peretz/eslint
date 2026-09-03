# Intent — Cut the merge bottleneck: one gate run per merged PR

> Stage 1 artifact. Opened after `ci-speed` shipped: check DURATION is largely
> solved, and the bottleneck moved to how many times we run those checks.

**Status:** draft · **Opened:** 2026-08-30 · **Owner:** @ofri-peretz

---

## What is wanted

**A ready PR merges without re-running the full gate N times.** The target is
~1 full-gate run per merged PR, against ~7 today — with no check removed and no
weakening of the "tested against latest main" guarantee.

Scope is the merge protocol. Check duration is a separate, largely-solved intent
(`docs/intents/ci-speed/`).

## Why now

`ci-speed` cut `quality.yml` from 194s to 37s and PR #758 does the same for the
gate that actually blocks a merge. That work makes each run cheap. It does
nothing about **how many runs a single PR costs**, and measurement says that is
now the dominant cost.

## Measured (24h window, 2026-08-30)

`quality-full.yml` runs, grouped by branch:

| runs             | branch                           |
| ---------------- | -------------------------------- |
| 17               | `main` (post-merge verification) |
| **12**           | `feat/infra-metrics`             |
| 10               | `feat/fp-precision-ratchet`      |
| 7                | `feat/name-inference-regex-form` |
| 6                | `feat/ai-native-sdlc`            |
| 5                | `feat/link-name-map`             |
| 3, 3, 3, 2, 2, 2 | six more branches                |

**84 full-gate runs in 24 hours to merge roughly 12 PRs — ~7x amplification.**
At 180-260s per run that is on the order of **4.7 hours of runner time per day**,
the large majority of it re-executing code that did not change.

## The mechanism

Branch protection sets `strict: true` — a PR must be up to date with `main` at
the moment it merges. `main` moves roughly every 10 minutes.

The consequence is quadratic, not linear. Every push to `main` invalidates
**every** open PR, and each one must re-sync and re-run the full gate to become
mergeable again. With N open PRs and M pushes to main, the protocol costs
**O(N x M)** gate runs, and only one PR can be "currently up to date" at a time.
This session's own PR paid that 12 times, and lost the merge race four times
while doing it.

Nothing here is a slow check. It is a slow _protocol_.

## Constraints

1. **`strict` semantics must be preserved, not dropped.** The guarantee — code
   is tested against the main it will actually land on — is the reason the
   setting exists. Simply turning it off would cut runs and reintroduce the
   class of breakage it prevents.
2. **No check removed, no threshold lowered.**
3. **A merge must never be able to hang forever.** The failure mode of the
   obvious fix is worse than the problem: enable a merge queue while the
   required checks do not report on `merge_group`, and every merge blocks
   indefinitely with no error.
4. **Actions minutes matter.** The fix should reduce total runs, not relocate
   them.

## Success criteria

- Full-gate runs per merged PR at or near **1** (from ~7).
- Total `quality-full.yml` runs per day **materially below 84** at comparable
  merge volume.
- Zero manual merge races: no human or agent re-syncing a branch to win a slot.
- `strict`-equivalent safety retained — nothing merges without having been
  tested against the main it lands on.

## Non-goals

- Reducing check duration further (that is `ci-speed`; the floor is now setup
  cost, ~12-16s per job).
- Prioritising any author's PRs over another's. Considered and rejected:
  it reorders a queue without reducing any duration, and the PRs it would have
  starved this session were themselves fixes landing on main — two of them
  spawned by this very work.
