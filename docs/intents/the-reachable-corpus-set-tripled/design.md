# Design — the backlog is ordered by what real code exercises

Intent: [`intent.md`](./intent.md). **Status:** shipped (2026-11-07).

---

## Requirements

- **R1.** The fixture writer emits the source's extension, not always `.js`.
- **R2.** The coverage check prints the unmeasured rules in descending
  real-world frequency, from the hashed inventory.

## Design

- `add-sourced-fixture.mts` takes the extension from `--path` (out of the
  eight the corpus globs read) and turns JSX parsing off for `.ts`, `.mts` and
  `.cts`.
- `check-corpus-coverage.ts` reads `benchmarks/budgets/real-world-rule-inventory.json`
  and prints the top 15 reachable rules, plus the reachable and fire-nowhere
  counts.

## Verification

`npx tsx scripts/check-corpus-coverage.ts` prints "Backlog by real-world
frequency (inventory HASH)". The benchmark-config fix is covered by the corpus
scorer itself: a `.tsx` fixture under `benchmarks/corpus/` is linted.

## Rejected alternatives

- **A gate on backlog order.** Rejected: ordering is guidance for whoever cuts
  the next fixture. Failing a PR over it would be a new gate (ADR 0011).

## Out of scope

Cutting the fixtures themselves.
