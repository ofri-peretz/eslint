# Design — every quality step has a home, or a recorded reason it is local

Intent: [`intent.md`](./intent.md). **Status:** shipped (2026-11-07).

---

## Requirements

- **R1.** `audit:claims:selftest` runs in CI, before the auditor it tests.
- **R2.** Each step that stays local-only has a `DOCS_QUALITY.md` row saying so,
  and why.

## Design

One step in `.github/workflows/quality.yml` and three rows in `docs/DOCS_QUALITY.md`.

## Verification

The PR gate runs the selftest. Non-vacuity was proven once by emptying
`PATTERNS`: the selftest failed on its first fixture.

## Rejected alternatives

- **A lock that every `quality` step is reachable from a workflow.** Rejected
  under ADR 0011: it is a new gate.
- **Run `logos:variants:check` and `ilb:flagship:smoke` on every PR.**
  Rejected: logo variants change by hand, rarely, and the flagship suite
  already runs weekly in full.

## Out of scope

Changing the `npm run quality` chain itself.
