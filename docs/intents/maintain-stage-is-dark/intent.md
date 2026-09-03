# Intent — the watchers are broken, so Stage 6 reports nothing

> Stage 1 artifact of the AI-native SDLC. Opened after finding five open
> failure issues filed by the maintenance crons, four of them with no comments.

**Status:** draft · **Opened:** 2026-09-01 · **Owner:** @ofri-peretz

---

## What is wanted

The scheduled watchers run to completion and land their snapshots, and a watcher
that fails reaches a person rather than an unread issue. Stage 6 is where every
other intent's success criteria are measured; while it is dark, no other intent
can be said to have shipped.

## Why now

Five open issues, all filed by crons, all fresh:

| Issue | Watcher                     | Opened     | Comments |
| :---- | :-------------------------- | :--------- | -------: |
| #803  | Comparison artifact refresh | 2026-09-01 |        0 |
| #802  | resource-profile refresh    | 2026-09-01 |        0 |
| #795  | Release pipeline stalled    | 2026-09-01 |        5 |
| #784  | peer-health snapshot        | 2026-08-31 |        0 |
| #782  | Weekly corpus scan          | 2026-08-31 |        0 |

Two of them share one cause. `peer-health` (run 33411140440) and
`resource-profile` (run 33502632167) both die pushing their snapshot:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
 ! [remote rejected] main -> main (protected branch hook declined)
```

The bots commit a snapshot and push straight to `main`. Branch protection
declines it, and `enforce_admins` is enabled, so no token is exempt. This is not
a secrets problem or a flaky test — the job does its work correctly and then
cannot deliver it.

`comparison-refresh` (run 33507198598) fails earlier, at a `Name-dependence
probe` step, and is a separate cause that has not been diagnosed yet.

The delivery half is its own failure. Four of the five issues have zero comments.
An issue nobody reads is the same as no alert, and a `cron-failure-delivery`
intent already sits in draft, which suggests this was noticed and not finished.

## Affected users and systems

`peer-health.yml`, `resource-profile.yml`, `comparison-refresh.yml`, the weekly
corpus scan, and the release pipeline. Downstream: every metric in
`docs/DOCS_QUALITY.md` whose cadence is "weekly", the control bands in
`.agent/control-bands.json` that need fresh observations, and any intent whose
success criteria are measured by one of these.

## Constraints

- **Do not weaken branch protection to let bots through.** `enforce_admins` and
  the required checks are the reason a person cannot quietly ship past the gate
  either. A bot needing an exemption is a reason to change how the bot delivers,
  not how the branch is protected.
- Snapshot commits must stay reviewable. Whatever replaces the direct push has to
  leave a diff someone can read, not an opaque force-write.
- Do not silence a failing watcher to clear the issue list. A watcher that is
  wrong should be fixed or deleted deliberately, and the deletion recorded.

## Success criteria

- `peer-health`, `resource-profile` and `comparison-refresh` each complete a
  scheduled run and land their snapshot.
- A watcher failure produces a notification a person actually sees, and the
  mechanism is written down here — not just an issue in a list nobody opens.
- Every one of #782, #784, #795, #802, #803 is closed or has a comment saying
  why it stays open.
- A check exists that would have gone red on the GH006 failure, rather than the
  failure living only in a run log.

## Open questions

- Do the bots open a PR (auto-merged when green), or does a scoped app token get
  an explicit protection bypass? The first is slower and reviewable; the second
  is a standing exemption that has to be audited.
- Is `comparison-refresh`'s `Name-dependence probe` failure a third cause, or a
  downstream symptom of stale snapshots the other two failed to write?
- How long have these actually been failing? The issues are days old, but the
  underlying breakage may predate them — worth `--backfill-git` style archaeology
  before claiming a fix window.
