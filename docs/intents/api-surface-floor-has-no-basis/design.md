# Design — the API-surface floor is judged against a measured basis

Intent: [`intent.md`](./intent.md). **Status:** shipped (as-built record, 2026-11-07).

This intent shipped in #959 before a `design.md` was written. This file records
what was built, so that the `shipped` status meets the lock in
`scripts/__tests__/intent-artifacts.lock.test.ts`.

---

## Requirements

- **R1.** No coverage figure in the repo is typed by hand. Every one is computed
  from the measured API surface.
- **R2.** The 60% floor is judged only against a curated denominator. A raw
  denominator is published as an upper bound and never passes or fails.
- **R3.** An `outOfScope` exclusion names an API that exists on the measured
  surface, and is not argued from how rarely it is used.
- **R4.** A hand-edited percentage fails the gate, even when it agrees with the
  measurement.

## Design

- `scripts/measure-api-surface.mts` enumerates each SDK's surface.
  `scripts/audit-api-surface.ts` reads that result instead of a typed count.
- `.agent/api-surface-manifest.json` holds the curated denominators and
  exclusions. It carries no counts.
- `.github/workflows/api-surface.yml` runs the audit on PRs.

## Verification

`scripts/__tests__/api-surface-coverage-is-measured.lock.test.ts`. It rejects a
typed `coverage_pct`, a percentage or "N of M" in notes, and an exclusion that
names an API not on the measured surface.

## Rejected alternatives

- **Re-type the counts more carefully.** Rejected: a typed count is the defect,
  however accurate it is on the day it is typed.
- **Judge raw denominators against the floor.** Rejected: a raw surface counts
  internals nobody would lint for, so the floor would be unreachable for a
  reason unrelated to coverage.

## Out of scope

Curating the remaining denominators. They stay published as upper bounds until
someone curates them.
