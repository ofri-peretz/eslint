# ADR 0002 — npm publish is not gated on a human approval

- **Status:** accepted
- **Date:** 2026-09-01
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/cron-failure-delivery/`](../intents/cron-failure-delivery/intent.md) (adjacent; this decision predates it)

## Context

`release.yml`'s publish jobs declared `environment: production`. That
environment carried a `required_reviewers` protection rule naming
`@ofri-peretz`, created 2025-11-02 and unchanged since.

The rule lived in **repository settings, not in the workflow file**. Nothing in
a code review, an ADR, or an SDLC artifact showed it. `release.yml` said only
`environment: production`, which reads as routine.

On 2026-08-31 the consequence became visible. Run 33346361671 built cleanly,
passed dist-integrity on all three ESLint majors, then parked **six publish
jobs in `waiting`** on that gate at 01:09. It held the `release-workflow`
concurrency group for about 4.5 hours. With `cancel-in-progress: false`
permitting exactly one queued run, the 01:11, 02:14 and 02:26 runs were
cancelled as surplus and the 05:26 run sat pending. Six packages were versioned
on `main` and absent from npm the whole time, and **no workflow was red**.

Neither piece is a bug on its own. The gate is a deliberate control; the
serialisation is deliberate. The failure is that together they hold the
pipeline indefinitely with no signal, because every check in the repo answers
"did a step fail" rather than "did a release come out".

## Decision

Remove `required_reviewers` from the `production` environment. Merging a
Version PR publishes to npm with no human step.

## Consequences

- A package change that merges is published without further action. That is
  the stated goal of the CD path.
- **Agent-authored code reaches the registry unreviewed.** This repo has
  auto-merge armed and an issue-sweep routine that opens and merges PRs. The
  human checkpoint moves earlier — to PR review and the required checks — and
  no longer sits in front of the registry.
- Removing the rule while deployments were pending **rejected** them rather
  than approving them; the six jobs went from `waiting` to `failure`. The
  queued run then drained and published all six. Worth knowing before doing
  this again.
- Verified after the change: 21 packages published from `783ebfdcd`, and 31 of
  31 package versions on `main` match npm.

## Alternatives considered

**Keep the gate, fix only the head-of-line block.** Rejected: it preserves a
manual step in a path the maintainer asked to be automatic, and the block is a
symptom. A slow approval is indistinguishable from an absent one.

**Split the environments — gate deploys, not publishes.** A real option: point
publish jobs at an ungated environment (keeping OIDC/Trusted Publishers) and
reserve `production` for docs and app deploys. Rejected for now as more moving
parts than the goal requires, and recorded here because it is the natural
fallback if unreviewed publishing proves uncomfortable.

## Related

The gate's silence is what motivated `scripts/check-release-liveness.ts`
(ADR 0006). A control that can hold a pipeline indefinitely needs something
that notices.
