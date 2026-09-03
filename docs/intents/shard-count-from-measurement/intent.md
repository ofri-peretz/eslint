# Intent — `shard-count-from-measurement`

**Status:** draft · **Opened:** `2026-08-30` · **Owner:** `@ofri-peretz`

---

## What is wanted

The heavy gate finishes a wide-blast-radius PR in **under 60 seconds**, the same
target the narrow case already meets. No check is removed, no coverage
threshold is lowered, and no assertion stops running.

## Why now

Measured on run
[33337052316](https://github.com/ofri-peretz/eslint/actions/runs/33337052316)
(PR #770, all 10 test shards selected). Wall clock **261s**. Step-level timings
across the ten shard jobs:

|                                | total across 10 jobs |
| ------------------------------ | -------------------- |
| `./.github/actions/setup`      | **133s**             |
| `actions/checkout`             | **31s**              |
| **actual `Run shard N of 10`** | **43s**              |

Every test in the repository runs in **43 seconds**. Getting to them cost
**164 seconds** of per-job overhead, paid ten times. Overhead:work is **3.8:1**.

The wall clock is worse than either number, because the jobs did not run
concurrently. All 18 jobs were _created_ at `21:40:13`; they _started_ between
`21:40:33` and `21:43:39` — a **186-second** spread, in waves of about six:

```
21:40:33  Benchmark configs load        21:42:57  Unit Tests (1/10)
21:40:35  Typecheck                     21:43:19  Unit Tests (9/10)
21:41:03  Portability Audit             21:43:26  Unit Tests (4/10)
21:41:11  Build (1/4)                   21:43:27  Unit Tests (10/10)
21:41:20  Unit Tests (7/10)             21:43:28  Unit Tests (6/10)
21:42:28  Unit Tests (8/10)             21:43:30  Build (3/4)
21:42:39  Unit Tests (2/10)             21:43:32  Unit Tests (5/10)
21:42:53  Script & Repo-Config Locks    21:43:34  Unit Tests (3/10)
21:42:54  Build (4/4)
21:42:56  Build (2/4)
```

Observed effective concurrency is **~6 jobs**, not the ~20 the earlier
sharding work assumed. At six slots, 18 jobs is three serial waves. Roughly
**80% of the 261s is queueing**, and the queue is fed by our own job count.

This inverts the reasoning behind `--matrix 10`. That number was chosen when
runners were assumed plentiful and the goal was to spread work thin. Under a
six-slot ceiling, each additional shard adds a **~20s setup tax** and one more
claim on the scarce resource, to remove ~4s of test work. Past about four
shards we are paying to go slower.

Reproduce:

```bash
gh api repos/ofri-peretz/eslint/actions/runs/<id>/jobs --paginate \
  --jq '.jobs[] | "\(.started_at)  \(.completed_at)  \(.name)"' | sort
```

## Affected users and systems

`.github/workflows/quality-full.yml` (test matrix, build matrix, the
`test-scope` report), `scripts/ci-test-shard.mts` (`SPLIT_ACROSS_SHARDS`), and
every contributor and agent waiting on the gate. Nothing published moves.

## Constraints

- **No check may be dropped or weakened.** This is a scheduling change only:
  the same test files run, with the same assertions.
- **Coverage stays whole-package.** `CI_TEST_SHARD_COVERAGE=1` (the daily
  Codecov job) must keep seeing unsliced packages — slicing hides files from a
  slice and the 100% thresholds fail.
- **Cold-cache runs must not regress past the timeout.** Fewer shards means
  more work per shard when turbo misses; `timeout-minutes` has to still hold.
- The affected filter stays. Narrow PRs already finish in ~59s and must not
  get slower.

## Success criteria

1. A PR whose diff selects **every** shard completes the `Quality (Full) Gate`
   in **≤ 60s** wall clock, measured the same way as the baseline above.
2. Total jobs dispatched by `quality-full.yml` on such a PR drops from 18 to
   **≤ 12**, so the run fits in two waves at the observed ceiling.
3. Sum of `Run shard N of M` step durations stays within noise of 43s — proof
   the work was rescheduled, not removed.
4. The narrow-PR case stays at or under its current ~59s.

## Open questions

- Is the ~6-slot ceiling a property of the account, or an artefact of the
  other worktrees' PRs running concurrently at the time of measurement? The
  baseline must be re-taken on a quiet repo before the shard count is treated
  as tuned rather than guessed.
- Cold-cache cost per shard is unmeasured. Every timing above is from a warm
  turbo cache; the failing shard 4 on PR #769 had to build a package from
  scratch, which is the case that sets `timeout-minutes`.
