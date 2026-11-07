# Design — the CWE-089 fixtures carry the evidence a real pg call site has

Intent: [`intent.md`](./intent.md). **Status:** shipped (2026-11-07).

---

## Requirements

- **R1.** Each CWE-089 fixture that calls `db.query` declares `db` as a
  node-postgres client.
- **R2.** No query text changes, so the vulnerable/safe labels still hold.
- **R3.** No rule is loosened to fire on a bare `.query` name.

## Design

Add two lines after each fixture's header (`const { Pool } = require('pg');
const db = new Pool();`) and bump `@lastReviewed`. The MCP fixtures (PR #1201) already have this shape.

## Verification

Lint `benchmarks/corpus/CWE-089/**` with `pg/no-unsafe-query` from the built
package: 4/4 vulnerable flagged, 0/4 safe. `npm run ilb:flagship:smoke` asserts
recall and F1 of 1.00 on this corpus, and the weekly benchmark republishes the
scorecard.

## Rejected alternatives

- **Keep the bare fixtures as a documented known-miss and add a second set.**
  Rejected: the bare form is not what real code looks like, so a "miss" on it
  measures the fixture, not the rule. Competitors scored on these files see a
  more realistic call site, not an easier one.
- **Make the rule fire on the name `.query` again.** Rejected by the intent's
  constraint: the evidence gate is the false-positive fix.

## Out of scope

Sourcing new CWE-089 fixtures from real repositories (ADR 0002). That is the
corpus backlog, measured weekly.
