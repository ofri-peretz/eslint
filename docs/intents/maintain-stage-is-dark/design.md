# Design — the watchers deliver through PRs, and failures reach a person

Intent: [`intent.md`](./intent.md). **Status:** shipped (as-built record, 2026-11-07).

This intent shipped before a `design.md` was written. This file records what was
built, so that the `shipped` status meets the lock in
`scripts/__tests__/intent-artifacts.lock.test.ts`.

---

## Requirements

- **R1.** A snapshot-writing cron delivers through a PR that auto-merges when
  green, never through a direct push to `main`.
- **R2.** A failed scheduled job opens or updates an issue, and a sweep acts on
  it.
- **R3.** A check fails if a workflow pushes straight to `main` again.

## Design

- `.github/actions/commit-via-pr` is shared by `peer-health`,
  `resource-profile`, `comparison-refresh` and the other snapshot crons.
- `.github/actions/report-failure` runs from an aggregate job (ADR 0006).
- A Claude Code Routine sweeps the failure issues. `issue-sweep.yml` arms
  auto-merge on the PR the Routine opens.

## Verification

- `scripts/__tests__/no-bare-push-to-main.lock.test.ts` and
  `ci-bot-push-lock.test.ts` fail on a direct push to `main`.
- `cron-alerting-shape.lock.test.ts` fails on a scheduled job with no reporter.

## Rejected alternatives

- **A protection bypass for a bot token.** Rejected by the intent's first
  constraint: it creates a standing exemption that has to be audited, and it
  leaves no reviewable diff.

## Out of scope

How often the Routine sweeps. That is a Routine setting, not repo code.
