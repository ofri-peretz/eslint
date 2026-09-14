# ADR 0001 — CodeQL analyses post-merge and nightly, not per pull request

- **Status:** accepted
- **Date:** 2026-08-30
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/ci-speed/`](../intents/ci-speed/intent.md)

## Context

The stated CI goal is a pull request that is green in about 60 seconds.

CodeQL averaged **212s per run over 31 runs in 24h — 109 minutes a day**, the
second-largest consumer in the repository. It is not a required status check, so
it never blocked a merge; what it did was occupy runners and keep the PR page
amber long after the blocking gate had finished.

Two facts made this decidable rather than a matter of taste:

1. **Its cost is not ours to optimise.** Analysis time belongs to the CodeQL
   engine. Unlike the build (which went 159s → 2s once cached) there is no
   lever that makes a scan three times faster. The only variable is _when_ it
   runs.
2. **Coverage does not depend on the PR trigger.** The workflow already
   analysed every commit landing on `main` via `push`, and its own comment
   described the PR trigger as "a fast-feedback convenience" that "cannot stand
   alone" — it skips draft PRs and never sees commits pushed straight to main.
   Scorecard's SAST check measures commits analysed, which `push` satisfies.

GitHub caps a public repository at roughly **20 concurrent standard-runner
jobs**. A single PR was spawning **38 jobs**, so removing work from the PR path
returns runner slots to the blocking gate — the saving is twice over.

## Decision

Remove the `pull_request` trigger from `codeql.yml`. Keep `push` to `main`,
keep `workflow_dispatch`, and raise the schedule from **weekly to nightly**
(`17 3 * * *`).

## Consequences

**Accepted cost.** A CodeQL finding now surfaces shortly _after_ a PR merges
rather than shortly before. For a repository where every merge is followed
immediately by analysis on `main`, and where nothing is released straight from
a PR branch, the exposure window is the gap between merge and the next `push`
run — minutes, not days.

**Gained.** ~109 minutes a day of runner time returns to the pool, ~1-2
concurrent job slots return to the blocking gate on every PR, and the PR page
resolves in the time the required checks take rather than the time the slowest
advisory scan takes.

**Improved, not merely traded.** The scheduled scan goes from weekly to
nightly. Actions minutes are free on public repositories, so the previous
weekly cadence was a saving that bought nothing.

**Reversible.** Restoring the `pull_request` trigger is a three-line change.
The tracking issue records the decision so it is revisited rather than
forgotten.

## Alternatives considered

- **Keep it on PRs and make it faster.** Rejected: no such lever exists.
- **Keep it on PRs but restrict to `paths`.** Rejected as insufficient — most
  PRs in this repo touch `packages/**`, which is exactly what CodeQL scans, so
  the filter would rarely fire.
- **Make it a required check.** Rejected: it would put a 212s advisory scan on
  the critical path of every merge, the opposite of the goal.

---

## Amendment, 2026-08-31 — the post-merge trigger is gone too

This ADR moved CodeQL off the PR path and named the **post-merge run as the
compensating control**. That control has now been removed as well: `codeql.yml`
triggers on `workflow_dispatch` and the daily 03:17 cron only.

Reason: on a main push CodeQL was the longest job at **208s**, against 109s for
the entire `Quality (Full)` gate. It is not a required check and gates nothing,
so it never delayed a merge — it competed for runners, on a repo where
concurrent slots are the binding constraint.

**The cost is real and is not a rounding error.** Scorecard's SAST check
measures the proportion of commits analysed and had reported 25 of 30. With one
scan a day that ratio falls, and the OpenSSF Scorecard score falls with it. A
vulnerability introduced by a merge is now found within 24 hours instead of
~208 seconds.

The README's CodeQL badge is a _different_ signal and is not what drops: it
reports the latest run's pass/fail, so it stays green on a passing daily scan
and simply reflects an older commit. Conflating the two would send the next
reader looking for a red badge that never appears.

That trade was the maintainer's call, made explicitly. It is one line to
revert — restore `push: branches: [main]` in `codeql.yml` — and this amendment
exists so the next person reading a dropped SAST score knows why it dropped
rather than treating it as drift.

---

## Reverted, 2026-09-14 — the post-merge scan is back

`push: branches: [main]` is restored in `codeql.yml`, closing #764.

What this ADR argued for and what the repo ended up with were two different
things, and the gap is the whole reason the tracker stayed open. Dropping
`pull_request` (2026-08-30) cost ~212s of runner contention and bought back a
check that gated nothing — a clean trade, and the one this ADR's title
describes. Dropping `push` the next day was a different decision wearing the
same justification: it removed the compensating control this document named,
and moved the accepted detection window from ~208 seconds to 24 hours.

So the title is now true again. CodeQL runs **post-merge, not per-PR**:

| trigger              | state         |
| -------------------- | ------------- |
| `pull_request`       | still removed |
| `push: [main]`       | **restored**  |
| nightly `17 3 * * *` | kept          |
| `workflow_dispatch`  | kept          |

The cost of restoring, stated as plainly as the cost of removing was: CodeQL is
again the longest job on a main push, ~208s against 109s for the entire quality
gate. It runs after the merge, so it delays nobody's PR, and Actions minutes are
free on a public repo — the contention is for concurrent slots, not budget.

What it buys back: Scorecard's SAST ratio (25 of 30 commits analysed before the
removal) and a merge-introduced vulnerability surfacing in minutes rather than
within a day.

The per-PR half of the decision stands. Nothing here argues for putting CodeQL
back on `pull_request`.
