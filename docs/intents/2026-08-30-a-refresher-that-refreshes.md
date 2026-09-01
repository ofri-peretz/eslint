---
slug: a-refresher-that-refreshes
opened: 2026-08-30
packages: []
cases: []
---

## What

Three artifacts in `check:audit-freshness` are stale, and at least one of them
advertises a refresh command that **does not refresh anything**:

```
API-surface manifest   (.agent/api-surface-manifest.json)   npm run audit:api-surface   ← audits, does not regenerate
Per-rule p95 budget    (benchmarks/budgets/per-rule-p95.json)  "update lastValidated"   ← no command at all
Stock-corpus overlap   (benchmark-results/stock-corpus-overlap.json)  npm run audit:stock-overlap  108d stale, needs oxc cloned
```

Give each row a command that actually produces the artifact, or drop its TTL
with a written reason.

## Why

This is a **recurrence of a class already fixed once**, which makes it an eval
gap rather than a chore.

`the-comparison-refreshes-itself` found four rows whose advertised npm script
did not exist — the underlying `scripts/ilb-*.ts` were unreachable by the name
the gate told you to type. That intent added the aliases and a monthly
workflow. It did not ask the next question: of the commands that _do_ exist,
which of them regenerate the artifact they are named against?

`audit:api-surface` is the answer. It audits. The freshness gate tells a reader
"run this to refresh" and running it changes nothing, so the row can never go
green and the staleness is permanent. That is worse than a missing script,
because a missing script fails loudly and this one succeeds.

The repo has now found this shape three times: four scripts that did not exist,
one `freshness-has-a-refresher.test.ts` that reduced a refresh command to the
literal string `"npx"` so every npx-shaped refresher passed vacuously, and now
a command that runs and does nothing. Three instances is a pattern, and the
pattern is: **the gate checks that a refresher is NAMED, never that it WORKS.**

## Constraints

- **Verify each command on a stock runner before scheduling it.** A scheduled
  job that cannot run is a seventh permanently-red thing — the binding
  constraint inherited from `the-comparison-refreshes-itself`, and the reason
  `audit:stock-overlap` stayed red there: it needs oxc cloned.
- An artifact that genuinely cannot be regenerated in CI drops its TTL **with
  the reason recorded in the gate**, as the corpus scan did. Dropping a TTL
  silently is how a number rots unobserved.
- The test must assert the refresher PRODUCES the artifact, not that a string
  naming it exists. Sabotage-verify: break the command and the gate fails by
  name.

## Done when

- `check:audit-freshness` has zero stale rows that are stale for lack of a
  working command.
- Every remaining TTL either has a command proven to regenerate its artifact on
  a stock runner, or a recorded reason it cannot.
- `freshness-has-a-refresher.test.ts` checks that running the refresher changes
  the artifact's timestamp, and fails when the command is replaced by a no-op.
