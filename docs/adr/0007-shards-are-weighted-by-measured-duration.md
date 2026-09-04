# ADR 0007 — Test shards are weighted by measured duration, not test-file count

- **Status:** accepted
- **Date:** 2026-09-03
- **Deciders:** @ofri-peretz
- **Supersedes:** the `cost = countTestFiles(...)` weighting in
  `scripts/ci-test-shard.mts`

## Context

`ci-test-shard.mts` bin-packs affected packages across shards with
longest-processing-time-first: walk heaviest first, each into the currently
lightest shard. LPT is the right algorithm and is not changing.

Its weight was `countTestFiles(dir)` — a **proxy** for how long a package takes.
Proxies drift. A package of five slow integration tests and one of twenty fast
unit tests weigh 4:1 in exactly the wrong direction.

Measured across tonight's PR runs:

| PR   | lane | shards | spread | idle |
| :--- | :--- | -----: | -----: | ---: |
| #854 | node |      4 |  1.66x | 175s |
| #854 | web  |      3 |  1.37x | 109s |
| #848 | node |      4 |  1.33x |  15s |
| #848 | web  |      3 |  1.83x |  27s |

A lane finishes with its slowest shard, so that idle is not only wasted runner
time — it is wall clock on the PR.

## Decision

`cost` is the **measured duration** of the package's test task, read from
`.agent/test-duration-profile.json`, produced by
`scripts/profile-test-durations.mts`.

Two properties are load-bearing:

1. **A missing profile is not an error.** With no file, every package falls back
   to `countTestFiles`, and bucketing behaves exactly as it did before. A
   package added tomorrow is not in the profile and still gets a sane weight.

2. **The fallback is converted, never mixed.** LPT sorts heaviest-first, so
   feeding it `83` (files) beside `12` (seconds) would sort every unprofiled
   package to the front and wreck the layout _while still looking like it was
   balancing_. `SECONDS_PER_TEST_FILE` puts the fallback in the same unit.

The profile is refreshed on a cadence, not per-PR: durations move slowly, and
regenerating per run would make the shard layout — and every cache key
downstream of it — nondeterministic.

## Consequences

Simulated over the same 36 testable packages, scoring both layouts by real
durations:

| shards | file-count weight                       | duration weight                        |
| -----: | :-------------------------------------- | :------------------------------------- |
|      3 | `[60, 79, 74]` — 1.32x, 24s idle        | `[71, 71, 71]` — **1.00x, 0s idle**    |
|      4 | `[51, 55, 50, 57]` — 1.14x, 15s idle    | `[54, 53, 53, 53]` — 1.02x, 3s idle    |
|      6 | `[31, 34, 38, 35, 37, 38]` — 1.23x, 15s | `[36, 36, 36, 35, 35, 35]` — 1.03x, 3s |

A first version of this ADR also claimed the measurement had corrected a
documented belief — that `docs` was 16s and `eslint-plugin-node-security` at 20s
was the real binding item, so the recorded shard-count ceiling came from the
proxy rather than the work.

**That claim is retracted.** The profiler recorded a task's duration on a
non-zero exit as though it were a successful run, so a failing package
contributed its time-to-failure. Seven packages fail in a developer worktree
with an incomplete install — `docs` and `eslint-plugin-node-security` among
them. Both numbers described how fast those packages break.

The generator now discards non-zero exits (caught in review on #871). What
remains unknown, honestly, is whether `docs` binds the floor: answering it needs
a profile taken where every package can actually run, which is CI and not a
laptop.

## Rejected

- **Keep file count, hand-tune a per-package multiplier.** A table of magic
  numbers nobody re-measures is the same proxy with more places to be wrong.
- **Regenerate the profile in the PR gate.** Costs the full suite serially to
  schedule a run of the same suite, and makes the layout nondeterministic.
- **Drop the file-count fallback entirely.** Then an unprofiled package weighs
  zero, LPT sorts it last, and it lands wherever — the failure is silent and
  looks balanced.

## Limits, honestly

The profile was recorded serially on a 14-core developer machine. Absolute
seconds will not match a 2-4 core runner; the **relative** weighting is what LPT
consumes and what transfers. The numbers above are a simulation of LPT, not an
observation of CI, and the real spread will differ.

LPT still cannot beat its largest single item. Better weights tighten the
spread; they do not move the lane's floor.
