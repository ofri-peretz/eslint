---
slug: the-comparison-refreshes-itself
opened: 2026-08-30
packages: []
cases: []
---

## What

Give the six artifacts that carry a TTL and nothing to reset it a scheduled
refresher, starting with the peer leaderboard.

| Artifact              |  Age | Refresh command           |
| --------------------- | ---: | ------------------------- |
| Peer leaderboard      | 112d | `ilb:leaderboard-publish` |
| CWE coverage report   | 112d | `docs:cwe-coverage`       |
| Federated wild-corpus | 112d | `ilb:federated-aggregate` |
| Stock-corpus overlap  | 108d | `audit:stock-overlap`     |
| Compliance crosswalk  | 112d | `ilb:mappings-report`     |
| ISO 25010 crosswalk   | 112d | `ilb:iso25010-report`     |

## Why

The leaderboard is the artifact that states where we stand against the
ecosystem. It is 112 days old, and nothing in the repo will ever make it
younger — there is no workflow, scheduled or otherwise, that runs the command
that produces it.

The last two report **fresh**. They carry a 180-day TTL, so they are 112 days
into a clock nothing can reset; counting stale artifacts would have missed them
for another two months. Asking "what refreshes this?" found all six at once.

A TTL with no refresher does not produce freshness. It produces a gate that
goes red and stays red, and a permanently red gate is one everybody learns to
scroll past — worse than not tracking the artifact, because the staleness is
then both real and ignored. `check:audit-freshness` currently lists seven stale
rows, which is exactly enough for the habit to form.

## Constraints

- **Cheapest schedule that beats the TTL**, not the fastest. A 180-day
  crosswalk does not need a weekly job, and Actions minutes are finite —
  `feedback_actions_quota_sensitivity` applies.
- Every command is verified to run on a stock runner BEFORE it is scheduled.
  Some may need a cloned corpus or network access, and a scheduled job that
  cannot run is a seventh permanently red thing.
- A command that genuinely cannot be automated says so and loses its TTL. An
  artifact nobody can refresh should not be pretending to have a shelf life.
- Refreshes commit a dated artifact. A workflow that regenerates and discards
  leaves the same gap.
- `UNREFRESHED` in `freshness-has-a-refresher.test.ts` may only shrink.

## Done when

- `UNREFRESHED` goes **6 → 0**, or every remaining entry has lost its TTL with
  a recorded reason.
- `npm run check:audit-freshness` reports no stale artifact.
- The peer leaderboard is under 30 days old and stays there without anyone
  remembering to run it.

## Outcome — 2026-08-30

`UNREFRESHED` went **6 → 1**, and five artifacts went from 112 days old to
zero. But the diagnosis in the Why above was wrong, and the real cause is worth
more than the fix.

It was not a missing schedule. **Four of the six advertised a refresh command
that did not exist.** `npm run ilb:leaderboard-publish` had no npm script behind
it; nor did `ilb:federated-aggregate`, `ilb:iso25010-report` or
`ilb:mappings-report`. The underlying `scripts/ilb-*.ts` were in the repo the
whole time, unreachable by the name the gate told you to type. Anyone who tried
to clear the staleness got `Missing script` and would reasonably conclude the
artifact was abandoned.

The constraint "verify each command runs on a stock runner BEFORE scheduling
it" is what caught it. Scheduling first would have produced five red monthly
jobs, which is the seventh-permanently-red-thing this intent was written to
avoid — and the workflow would have looked like the problem.

Adding the four aliases and running all five was the whole fix.
`.github/workflows/comparison-refresh.yml` runs them monthly — the shortest TTL
here is 30 days, so monthly beats every one with margin at a twelfth of a
weekly job's minutes — commits what moved, and reports a failure through the
shared `report-failure` action.

`audit:stock-overlap` keeps its TTL and stays the single entry in
`UNREFRESHED`. It needs `oxc-project/oxc` cloned to compare our rule set with
oxlint's stock rules; automatable only by checking out a second large
repository on a schedule, which costs more than the artifact is worth today.
It keeps the TTL deliberately, so the staleness stays visible rather than being
declared fine.

Three rows remain stale for reasons outside this intent: the API-surface
manifest, the CVE→rule latency audit, and the per-rule p95 budget — the last of
which advertises a prose instruction rather than a command, so no schedule can
ever satisfy it.
