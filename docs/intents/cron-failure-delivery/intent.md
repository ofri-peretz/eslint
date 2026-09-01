# Intent — `cron-failure-delivery`

**Status:** draft · **Opened:** `2026-09-01` · **Owner:** `@ofri-peretz`

---

## What is wanted

When a scheduled workflow fails, a human finds out — whichever way it failed.

Today the repo already *declares* that: 21 of 22 scheduled workflows carry a
failure-reporting step. The declaration is not the outcome. This intent is
satisfied when the reporting is shown to fire for every failure shape those
workflows can actually produce, and when a shape nobody handled makes CI red
rather than making the silence permanent.

## Why now

A survey of every scheduled workflow on 2026-09-01 (`gh run list --event
schedule --limit 1` per workflow, cross-referenced against
`gh issue list --state all`):

| workflow | failing since | issue filed |
| :--- | :--- | :--- |
| `resource-profile` | 2026-08-01 | none |
| `benchmark` | 2026-08-25 | none |
| `eslint-version-matrix` | 2026-08-29 | none |
| `integration-health` | 2026-08-29 | none |
| `oxlint-parity` | 2026-08-30 | none |
| `peer-health` | 2026-08-31 | #784 |
| `weekly-corpus-scan` | 2026-08-31 | #782 |
| `evals` | no conclusion recorded | none |

**Eight failing, two reported.** Not one issue was ever filed — open or closed
— for five of them.

The reason it is worth an intent rather than five fixes is that the five
silences have **five different causes**:

1. `oxlint-parity` — the report step exists in `deep-parity` only. The job that
   failed, `runtime-and-parity`, has none. The *file* mentions
   `report-failure`, so any scan of the file passes.
2. `integration-health` — the step's `if:` tested `inputs.create-issue !=
   false`. On a `schedule` run `inputs.*` is empty and GitHub coerces `''` to
   false, so it fired only on manual dispatch: only when someone was already
   watching. Found reactively and fixed in #754; the fix is not yet on `main`.
3. `eslint-version-matrix` — `fail-fast: true` with the report step inside the
   matrix job. One leg failed, seven were **cancelled**, and `failure()` is
   false in a cancelled leg.
4. `resource-profile` — monthly cron (`0 6 1 * *`); the report step was added
   after its last run. Not a defect, but it explains one of the eight and would
   otherwise be miscounted as one.
5. `benchmark` — no reporting declared at all.

Only (5) is what a structural "does this file mention report-failure" lock
would catch. The other four look correct in review and in the file. That is the
whole problem: **we keep finding these one at a time, from the outside, by
noticing something did not happen.**

This is the same failure mode as two others closed this week — a release
pipeline that stalled green behind an unapproved gate, and a `.tsbuildinfo`
cache that made `tsgo` skip work it reported as done. A control that is
present, reviewable, and inert.

## Affected users and systems

All 22 workflows under `.github/workflows/**` carrying a `schedule:` trigger,
the shared `.github/actions/report-failure` composite, and the GitHub issue
backlog that `issue-sweep.yml` is meant to consume.

Downstream: the `issue-to-fix-loop` intent is blocked on this one. Automating
fixes against a backlog that is missing six of eight known failures automates
the wrong worklist.

## Constraints

- **No new required PR check that costs runner minutes per push.** The
  concurrency budget is the binding constraint on this repo; per-workflow
  synthetic failure runs on every PR are not affordable.
- **No third-party action** in the verification path. `report-failure` is
  already in the supply chain of every cron; nothing new joins it.
- **Deduplication must survive.** `report-failure` dedupes by title so a
  persistent failure comments rather than spams. A fix that files an issue per
  run per matrix leg trades silence for noise, and noise gets muted, which is
  silence again.
- **A workflow may legitimately have no alert** (an advisory probe). That must
  be declared explicitly, not achieved by omission.

## Success criteria

1. Every job in every `schedule:`-triggered workflow either reaches a reporting
   step on failure, or is covered by an aggregate reporting job that `needs` it
   and runs with `if: always()`. Checked by a lock that reads the job graph,
   not the file text.
2. No reporting condition depends on `inputs.*` without a `github.event_name`
   guard — the trap that silenced `integration-health` for two red runs.
3. Any matrix job with `fail-fast: true` reports from an aggregate job, not
   from inside the legs, so `cancelled` siblings cannot swallow the signal.
4. A single live canary proves the channel end-to-end on a schedule: it fails
   on purpose and asserts an issue appears. This covers token, permissions and
   the composite itself — the parts a static rule cannot see.
5. The eight failures above are each either fixed, or carry an open issue
   explaining why they are red. "Red and unexplained" is zero at close.
6. Each of the five causes has a test that fails when the cause is
   reintroduced. Per CLAUDE.md, sabotage-proven — a green run on a
   correctly-shaped file is not evidence.

## Open questions

- Is the canary one dedicated workflow, or a `workflow_dispatch` mode on each
  cron? One canary is cheap and proves the channel; per-workflow proves each
  caller. The cost difference is 1 run vs 22 per cycle.
- `evals` records no conclusion at all. Is it failing, or never completing?
  That is a different defect and may not belong to this intent.
- Should `benchmark.yml`'s missing reporting be fixed here or be declared an
  intentional no-alert workflow? Nobody has stated which it is.
- Does `report-failure`'s title-dedupe reopen a *closed* issue when the failure
  recurs, or does it stay silent because a matching title exists? Untested, and
  it decides whether criterion 5 holds a month from now.
