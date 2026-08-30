---
slug: adoption-north-star
opened: 2026-08-30
packages: []
cases: []
---

## What

Measure **new repositories per week with an Interlace plugin in their
lockfile**, on a schedule, committed as a dated artifact beside the peer
numbers.

Point the existing peer-repository scan at our own package names, tag each
first-seen repository with the week it appeared, and render the series next to
the head-to-head that `peer-health` already produces.

## Why

Product quality is instrumented to fifty-odd metrics. Acquisition is
instrumented to none — `EVALUATION_METRICS.md` §9 measures _health signals_
(downloads, stars, release cadence), which say whether a project looks alive.
They do not say where a prospective user stopped, and they cannot say whether
anybody new arrived this week.

Downloads are the metric we have and the wrong one to steer by. They are
dominated by CI re-runs of existing adopters, so they rise when nothing has
happened and fall when a single busy consumer changes their pipeline. A new
repository in a lockfile only moves when a human chose us.

The denominator already exists: the outreach database enumerates ~28,000
repositories running peer plugins. That is simultaneously the addressable
market and the comparison — our count is meaningless without it.

**This number will read as zero or near-zero for a while.** That is the point
of measuring it: 30,509 weekly downloads across 30 plugins against peers in the
millions is not a growth story, and a number that admits it is more useful than
four that flatter.

## Constraints

- **GitHub code search is rate-limited to ~10 requests/minute.** The scan is
  weekly and paginated, never inline in a PR.
- No telemetry in any published package. A linter that phones home would be a
  scandal and would deserve to be. Everything here is measured from the outside.
- The artifact is append-only and dated. A first-seen week that changes
  retroactively makes the series worthless.
- It must land in `check:audit-freshness` **with a scheduled refresher**, or it
  joins the six artifacts that already have a TTL and nothing behind them.
- The first reading is a data point, not a trend. No decision is made on fewer
  than four weeks.

## Done when

- A weekly workflow commits `benchmark-results/adoption.json` with, per week:
  repositories seen, repositories new that week, and the package that brought
  each in.
- `peer-health.md` renders the series beside the download-to-star table.
- `check:audit-freshness` tracks it and
  `freshness-has-a-refresher.test.ts` does **not** need a new entry in
  `UNREFRESHED` — the shrink-only list stays at six.
- `AI_SDLC.md`'s funnel table shows Adoption as instrumented rather than
  `(gap)`, and gap 3 moves to Closed with the workflow named.
