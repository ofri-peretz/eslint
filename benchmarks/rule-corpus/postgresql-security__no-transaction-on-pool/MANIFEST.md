# Rule corpus - `postgresql-security/no-transaction-on-pool` (CWE-662)

## What the rule owns

`BEGIN` / `COMMIT` / `ROLLBACK` issued on a **Pool** rather than on a checked-out
client. A pool hands out a different connection per query, so the BEGIN, the
writes and the COMMIT can land on three separate backends. The transaction does
not exist, the writes are not atomic, and the connection that ran BEGIN goes
back into the pool still inside an open transaction — where the next unrelated
request inherits it.

The remediation is `pool.connect()`, the whole transaction on that one client,
and `release()` in a `finally`.

## The defect this corpus was written to expose

The rule decided a receiver was a Pool with
`objectName.toLowerCase().includes('pool')`. That is a spelling, not a fact, and
it was wrong in **both directions at once**:

- `poolClient.query('BEGIN')` — a correctly checked-out client running a correct
  transaction — was reported. The rule fired on the remediation.
- `carpoolClient.query('BEGIN')` — a ride-sharing API — was reported. It shares
  four letters with a connection pool and nothing else.
- A real `new Pool()` bound to `db` was invisible.

What decides it now is what the binding was assigned.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | the canonical `pool.query('BEGIN')` |
| `vulnerable/02` | a real Pool bound to `db` — the spelling is not the weakness |
| `vulnerable/03` | the pool on `this`, the ordinary repository shape |
| `vulnerable/04` | a ROLLBACK on the pool from a catch block |
| `vulnerable/05` | the statement as a template literal |
| `vulnerable/06` | a typed pool, and lowercase keywords |
| `vulnerable/07` | `START TRANSACTION` / `END`, the SQL-standard spellings |
| `vulnerable/08` | the `{ text }` config object form |
| `vulnerable/09` | the pool as a class field |
| `vulnerable/10` | trailing semicolons, padding, an isolation level, `SAVEPOINT` |
| `safe/01` | the remediation: connect, transact, release in a finally |
| `safe/02` | **a checked-out CLIENT named `poolClient`** |
| `safe/03` | **`carpoolClient` — a ride-sharing API, not a database** |
| `safe/04` | single-shot queries on the pool, which is what a pool is for |
| `safe/05` | a dedicated `new Client()` — one connection by construction |
| `safe/06` | a transaction on a client passed into a helper |
| `safe/07` | "BEGIN" as data in a WHERE clause and a LIKE pattern |
| `safe/08` | `beginning_balance` / `ended_at` — identifiers that start with a keyword |
| `safe/09` | a `Pool` from `generic-pool` |
| `safe/10` | an injected handle this file cannot prove is a pool |

## Deliberately out of scope

- **An injected handle** (`safe/10`). The CORRECT transaction shape passes a
  client into a helper exactly like this, so a rule that reported an
  unresolvable handle would fire on the remediation. Abstaining is the right
  side to err on.
- **A reassigned binding.** What reaches the sink is not knowable.
- **A dedicated `Client`.** One connection by construction; the transaction is
  correct.

## Adversarial wave

Fixtures 08–10 (vulnerable) and 08–10 (safe) were written after the rule first
scored 100%. They took it to **94.7%** and found one real defect:
`pool.query({ text: 'BEGIN' })` — node-postgres' documented config-object form —
went straight past a rule that only read a string.
