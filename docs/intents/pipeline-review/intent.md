# Intent — the pipeline is optimised against the constraint that actually binds

**Status:** shipped · **Opened:** `2026-09-03` · **Owner:** `@ofri-peretz`

---

## What is wanted

Every stage of CI, CD and the scheduled workflows reviewed against the limits
that really apply to this repository, with each candidate optimisation either
executed or rejected on a measured number — never left as an untested opinion.

## Why now

Three separate efforts had optimised this pipeline against the wrong quantity.
`ci-speed` and `concurrency-budget` targeted check DURATION and succeeded;
`merge-latency` targeted run AMPLIFICATION and stalled on a false blocker. None
of them measured the ceiling that was actually being hit.

Measured 2026-09-03:

| quantity            | value                                          | binds?        |
| :------------------ | :--------------------------------------------- | :------------ |
| Actions minutes     | free, unlimited (public repo)                  | no            |
| **Concurrent jobs** | **20** — GitHub Free, no public-repo exemption | **yes**       |
| Actions cache       | 10 GB/repo, sitting at 9.74 GB                 | yes           |
| Vercel Remote Cache | request RATE (Hobby 100/min)                   | yes, if Hobby |
| PR wall clock       | `review` is 88-99% of it, median 124s          | yes           |

The PR gate is 14 workflows / 45 jobs / 25 setup calls into 20 slots. Observed
peak 18 concurrent and 35 job starts inside one minute, so jobs queue: **p50
25s, p90 69s, max 87s**, and the longest waits fall on the smallest jobs —
`oxlint (fast pass)` waits 61s, then spends ~41s on setup to lint for ~9s.

An earlier measurement in this same effort reported queue latency as 0s and
concluded capacity was not the problem. It was taken at RUN level; runs start
immediately and JOBS queue. Optimising against a number measured at the wrong
granularity is how the three prior efforts each missed this.

## Constraints

- **20 concurrent jobs.** Slots are the scarce resource; minutes are not.
- **Required contexts cannot be path-filtered.** `oxlint (fast pass)`,
  `Quality (Full) Gate` and `review` must always report, or branch protection
  waits forever on a check that never arrives.
- **Fork PRs receive no secrets and no writable `id-token`.** Every cache or
  auth path must degrade to something that still works for them.
- **Repository settings stay with a human.** The merge queue is the largest
  remaining win and is deliberately not taken here.
- **A control that stops running must fail loudly.** Every gate added must fail
  open, or be locked so that silence is caught.

## Success criteria

1. Every stage has candidates recorded with a measured verdict — executed or
   rejected with the number that killed it.
2. No exact cron collision remains against the 20-slot ceiling.
3. Documentation-only PRs no longer pay the `review` tail.
4. Per-job setup shrinks for jobs that provably do not need the full tree.
5. Every claim in the design is reproducible from a command written beside it.

## Rejected

- **Consolidating small jobs into one.** Frees ~5 slots but serialises ~110s
  that currently runs in parallel at ~30s, and would rename a required context.
- **Path-filtering `docs.yml`.** Its filter would need `packages/*/src/rules/**`
  (README tables), which most PRs touch anyway.
- **Removing the `push: main` runs of quality/quality-full.** They are the only
  thing that catches a main broken by an `--admin` or draft-merged PR.
- **Enabling the merge queue.** Correct, unblocked, and not ours to switch on.
