# Rule corpus - `postgresql-security/no-batch-insert-loop` (CWE-1049)

## What the rule owns

A **query executed once per element** — the N+1 problem. One round trip per row
means latency scales with the result set, and a 50k-row import becomes 50k
sequential network waits. The remediation is a set-based statement: `= ANY($1)`
for the read, `INSERT … SELECT * FROM unnest($1, $2)` for the write.

## The defect this corpus exposed

The rule returned early unless the SQL contained `INSERT` or `UPDATE`:

```js
if (!query.includes('INSERT') && !query.includes('UPDATE')) return;
```

That excludes **the N+1 problem by its textbook definition** — one parent query,
then one child SELECT per parent row — which is the exact shape the rule's own
documentation link (use-the-index-luke, "nested loops join, the N+1 problem")
describes. The rule's own test asserted the exclusion as correct, commented
"SELECT inside loop is acceptable for this rule (targeted at mutations)".

Worse, the filter only ran when the argument was a plain string, so the
identical SELECT written as a template literal reported and the string form did
not. Two spellings of one statement, two verdicts.

The false positives came from a second assumption: that "the enclosing node is a
CallExpression" means the lambda is invoked. `jobs.push(() => pool.query(...))`
and `items.forEach((i) => pool.query(...))` are the same AST shape and opposite
facts — `push` STORES the lambda, `forEach` INVOKES it — so the rule reported a
loop that only built an array of thunks.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical importer: one INSERT per row in a `for…of` |
| `vulnerable/02` | **the N+1 SELECT** — one child read per parent row |
| `vulnerable/03` | `forEach` with an async callback |
| `vulnerable/04` | a `while` drain loop on a checked-out client |
| `vulnerable/05` | the query two loops deep |
| `vulnerable/06` | `for await` over a stream, pool on `this`, typed |
| `vulnerable/07` | `do…while` with template-literal SQL |
| `vulnerable/08` | a labelled loop and the `{ text, values }` config form |
| `vulnerable/09` | the sequential-`reduce` idiom, reached through `.then` |
| `vulnerable/10` | `for…in` over an object of counters |
| `vulnerable/11` | the query buried in a `switch` inside the loop |
| `vulnerable/12` | `for (;;)` with a manual break |
| `vulnerable/13` | a real loop **inside** a `Promise.all` fan-out |
| `vulnerable/14` | a `map` nested inside a `for…of` |
| `safe/01` | the remediation: loop builds arrays, one `unnest` insert |
| `safe/02` | the set-based read, `= ANY($1)`, grouped in JS |
| `safe/03` | `await Promise.all(ids.map(…))` — concurrent fan-out |
| `safe/04` | an offset pagination loop, typed |
| `safe/05` | a loop that builds placeholders; one multi-row INSERT after |
| `safe/06` | `jobs.push(() => pool.query(…))` — a thunk, not an execution |
| `safe/07` | a loop that touches no database |
| `safe/08` | a single-purpose helper; the caller's loop is not visible here |
| `safe/09` | an Express handler — a function body is not a loop |
| `safe/10` | `Promise.allSettled` over a bounded chunk, typed |
| `safe/11` | the fan-out with the promise array held in a **binding** first |
| `safe/12` | keyset pagination: LIMIT, no OFFSET, under a `while` |
| `safe/13` | `connect` / `release` / `on` in a loop — not the sink |

## Judgement calls, and why

- **`Promise.all(items.map(i => pool.query(...)))` is the FIX, not the defect.**
  This is the shape people write specifically to escape the sequential round
  trips this rule exists to catch; its own remediation (`unnest`, `= ANY`) is a
  further, optional optimisation, so reporting it fires on the fix. The residual
  risk is real — a very large input saturates the pool — but that is a
  concurrency-limit problem with a different remediation (chunking), not an N+1.

  The implementation does **not** special-case `Promise.all`. `map` and
  `flatMap` are treated as transparent value producers, because `map` PRODUCES
  an array of promises and whoever consumes it decides the concurrency. That is
  a better line in three ways: it survives the indirection through a binding
  (`safe/11`), it does not need a list of combinator names, and it keeps
  reporting a `map` nested inside a real loop (`vulnerable/14`) because the walk
  continues upward instead of stopping. What `map` does not excuse — a discarded
  array of promises — is a floating-promise defect and belongs to
  `no-floating-query`.

- **A loop that only BUILDS a values array is not a finding** (`safe/01`,
  `safe/05`). The query runs once, after the loop. Nothing to batch.

- **Pagination is not an N+1** (`safe/04`, `safe/12`). `while (true) { … LIMIT $1
  OFFSET $2 }` issues one statement per PAGE, so its round trips scale with
  pages, not rows — the LIMIT is there precisely to bound the result set. Two
  signatures are honoured: LIMIT with OFFSET is unambiguous pagination whatever
  the loop; LIMIT alone counts only under `while` / `do…while`, which iterate a
  CONDITION rather than a collection and so cannot be N+1 over rows in the first
  place. `for (const u of users) { … LIMIT 1 }` is an ordinary N+1 and still
  reports.

- **An IIFE is transparent, a stored lambda is a boundary.** `(async () => {
  await pool.query(...) })()` runs exactly once where it is written, so the walk
  passes through it and a loop above still reports. `jobs.push(() =>
  pool.query(...))` never runs here at all.

- **The rule is intra-procedural** (`safe/08`). Blaming a callee for its
  caller's loop would report every repository method anybody ever calls twice.

## Deliberately out of scope

- **A retry loop** (`while (attempt < 3) { try { await pool.query(...) } … }`).
  It is bounded and it is not one query per row, but there is no reliable
  structural signature separating it from a drain loop, and inventing a fuzzy
  one is worse than a documented limitation. **This is a known false-positive
  class.**
- **A query scheduled from inside a loop** (`setTimeout`, `queueMicrotask`).
  The callback is a boundary; when it runs and how often is the scheduler's
  business.
- **Interprocedural N+1** — a helper called from a caller's loop.

## Adversarial wave

Fixtures `vulnerable/11–14` and `safe/11–13` were written after the rule first
scored 100%. `vulnerable/13` and `vulnerable/14` were aimed directly at the
concurrency carve-out — a real loop nested inside a fan-out, and a `map` nested
inside a real loop — and `safe/11` at the carve-out's indirection. The rule held
at **100%**, but writing them is what replaced the `Promise.all` special case
with the simpler and stricter `map`-is-transparent rule.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 9 | 2 | 1 | 81.8% | 90.0% | 85.7% |
| after | 14 | 0 | 0 | 100% | 100% | **100%** |
