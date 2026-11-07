# Design — the corpus says it cannot hold an import-graph rule

Intent: [`intent.md`](./intent.md). **Status:** shipped (2026-11-07).

---

## Requirements

- **R1.** `check-corpus-coverage` excludes the six import-graph rules from both
  the measured and the fixturable count, with a stated reason.
- **R2.** The reason names where those rules ARE measured, so the exclusion is
  not a silent hole.

## Design

Six entries in the existing `NOT_FIXTURABLE` map of
`scripts/check-corpus-coverage.ts`, sharing one `IMPORT_GRAPH` reason string, and
a re-banked `benchmarks/budgets/corpus-coverage-baseline.json`.

## Verification

`npx tsx scripts/check-corpus-coverage.ts` prints "N cannot — see
NOT_FIXTURABLE" and passes. Removing an entry puts the rule back in the
unmeasured list.

## Rejected alternatives

- **Multi-file corpus fixtures.** Rejected: they would change the shape of
  hundreds of working fixtures and both scorers that read them, to serve six
  rules. That is the trade the intent's first constraint refuses.

## Out of scope

Measuring these rules' precision on real code. The real-source scan already does.
