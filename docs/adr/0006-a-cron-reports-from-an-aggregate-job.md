# ADR 0006 — A scheduled workflow reports from an aggregate job, and the gap is a ratchet

- **Status:** accepted
- **Date:** 2026-09-01
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/cron-failure-delivery/`](../intents/cron-failure-delivery/intent.md)

## Context

On 2026-09-01, **7 of 15** scheduled workflows were failing and **3** had filed
an issue. The other four were not missing alerting — three of them declared it.
They failed in shapes their alerting could not see:

| workflow | mechanism |
| :--- | :--- |
| `benchmark` | 7 jobs, no reporting anywhere |
| `eslint-version-matrix` | report inside a `fail-fast: true` matrix; a cancelled sibling makes `failure()` false |
| `oxlint-parity` | report only in `deep-parity`; `runtime-and-parity` was the job that broke |
| `integration-health` | `if:` read `inputs.*`, empty on `schedule`, coerced to false |

Four causes, four workflows. A scan asking "does this file mention
`report-failure`" passes three of them. That is worse than no check, because it
reads as coverage — and it is the check most people would write.

Two workflows resolved themselves on their next run once their report step
existed (`resource-profile`, and `integration-health` awaiting its Saturday
cron), which is worth recording: some of this was diagnosis error, not defect.

## Decision

1. **Report from an aggregate job.** A `report` job that `needs` every working
   job and runs on `always() && contains(needs.*.result, 'failure')` sees the
   whole run, rather than the job it happens to live in.
2. **Assert the job graph, not the file text.**
   `cron-alerting-shape.lock.test.ts` computes, per scheduled workflow, which
   jobs can fail and whether any reporter both `needs` them and survives their
   failure.
3. **Carry the remainder as a ratchet.** Running the graph check surfaced nine
   more uncovered jobs across eight workflows that no failure had exposed yet.
   They are recorded in `.github/cron-alerting-debt.json`: entries may be
   removed, never added, and a paid-down entry must be deleted or the ratchet
   stops ratcheting.

## Consequences

- A cron failing in any job now reaches the issue backlog.
- Nine known gaps remain, visible and bounded rather than unknown. Several are
  single-job crons that file **finding** issues (their purpose) but have no
  **failure** reporter — a distinction that needs a judgement per workflow.
- `# alerting: none — <reason>` is the explicit opt-out. Silence becomes a
  declaration with an author, not something achieved by omission.
- Sabotage-proven both directions: removing a reporter fails with its
  now-uncovered jobs named, and marking already-covered work as debt fails too.

## Alternatives considered

**Assert zero uncovered jobs today.** Rejected: it means either a red suite or
deleting the finding, and both end with the debt invisible again — the exact
failure this decision exists to remove.

**Set `fail-fast: false` everywhere** so each matrix leg can report. Files N
issues for one broken matrix, and pays N legs of runner time to do it.

**A live canary** that fails on purpose and asserts an issue appears. Still
open, and the stronger check — it covers token, permissions and the composite,
which no static rule can see. Deferred because #802 and #803 demonstrated the
channel works; the shape was the failing half.
