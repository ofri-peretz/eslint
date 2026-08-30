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
