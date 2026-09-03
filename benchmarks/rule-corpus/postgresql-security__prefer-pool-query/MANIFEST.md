# Rule corpus - `postgresql-security/prefer-pool-query` (CWE-400)

## What the rule owns

A **manual `pool.connect()` / `client.release()` round trip for one statement**.
`pool.query()` does exactly this and cannot leak the connection; doing it by hand
holds a pool slot for the whole function and is one missed `release()` away from
exhausting the pool.

The remediation is `pool.query(text, values)`.

## The defect this corpus exposed

The rule counted **syntactic call sites**:

```js
if (queryCallCount === 1 && releaseCallCount === 1 && otherUsageCount === 0)
```

That is a different quantity from "runs once". Reusing a checked-out client
across a loop is the entire reason `pool.connect()` exists — it avoids
re-acquiring a pool slot per iteration — and it has exactly one
`client.query(...)` in the source. The rule reported it, which is advice to make
the code slower. The same counting bug reached `rows.map((r) =>
client.query(...))` and a retry wrapper.

The second half read only a plain-string first argument and only recognised
`BEGIN` / `COMMIT` / `ROLLBACK`. So a client checked out to hold **session
state** — an advisory lock, a `SET`, a `LISTEN`, a cursor, a COPY stream — looked
identical to a single-shot read. Five of the first wave's six false positives
were exactly that.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | connect, one SELECT, release |
| `vulnerable/02` | the same, with the correct try/finally |
| `vulnerable/03` | a typed `PoolClient` checked out per Express request |
| `vulnerable/04` | the statement as a template literal |
| `vulnerable/05` | the `{ text, values }` config form |
| `vulnerable/06` | the pool on `this`, the repository shape |
| `vulnerable/07` | a single `INSERT … RETURNING` |
| `vulnerable/08` | the checkout inside an arrow handler |
| `vulnerable/09` | `SELECT … FOR UPDATE SKIP LOCKED` — looks transactional, is not |
| `vulnerable/10` | leading newlines and lowercase keywords |
| `vulnerable/11` | `release(true)` |
| `safe/01` | **an explicit BEGIN/COMMIT transaction** |
| `safe/02` | `pool.query()` directly — the remediation |
| `safe/03` | `pg_try_advisory_lock` — one query, session-scoped |
| `safe/04` | `client.query(new Cursor(...))` — not a statement |
| `safe/05` | **one call site, N executions**: a loop reusing the client, typed |
| `safe/06` | a temp table and the read that uses it |
| `safe/07` | `client.query(copyFrom(...))` — a COPY stream |
| `safe/08` | the single call site inside a `map` callback |
| `safe/09` | `LISTEN` plus a `notification` listener |
| `safe/10` | `DISCARD ALL` — exactly one query, and it is session state |
| `safe/11` | a session `SET`, and the client passed into a helper |
| `safe/12` | `SET LOCAL` as a template literal, typed |
| `safe/13` | `begin isolation level serializable`, written lowercase and padded with leading and trailing whitespace |
| `safe/14` | the query inside a retry wrapper's callback |
| `safe/15` | `pg_advisory_unlock_all()` — another advisory-lock spelling |

## Judgement calls, and why

- **A `client.query()` inside an explicit BEGIN/COMMIT transaction is CORRECT
  and must be quiet** (`safe/01`, `safe/13`). A transaction REQUIRES one
  connection for every statement; a pool hands out a different backend per
  query. A rule that reports it is telling the user to break atomicity — the
  exact defect `no-transaction-on-pool` in this same plugin forbids. Two rules in
  one plugin cannot give opposite advice about one line of code.

- **Session-scoped statements are quiet.** A client is checked out on purpose
  whenever the effect belongs to the CONNECTION rather than to the statement:
  `SET` / `RESET` / `DISCARD` (session GUCs), `LISTEN` / `UNLISTEN` (the
  subscription is registered on one backend and lost when it is recycled),
  `DECLARE` / `FETCH` / `MOVE` / `CLOSE` (a cursor is bound to its connection),
  `PREPARE` / `EXECUTE` / `DEALLOCATE`, `COPY`, `LOCK`, and the transaction
  keywords. Matched on the **leading keyword**, so `SELECT … WHERE kind = 'SET'`
  is data.

- **Advisory locks needed separate handling.** `pg_advisory_lock` and its family
  are ordinary `SELECT`s, invisible to a leading-keyword test, and held by the
  BACKEND. Taken through a pool the lock is released the moment an unrelated
  request gets that connection — or never, because the holder went back into the
  pool.

- **`SELECT … FOR UPDATE` is still a finding** (`vulnerable/09`). Outside an
  explicit transaction block it locks for the duration of the one implicit
  transaction that runs it and then drops it, so the checkout buys nothing. A
  guard that abstained on anything lock-shaped would have missed it — which is
  why the guard is a keyword list and an explicit function family, not a hunch.

- **An unreadable first argument means abstain.** `client.query(new Cursor(...))`
  and `client.query(copyFrom(...))` are not statements at all — they are cursor
  and stream handles bound to that connection, and `pool.query()` has nowhere to
  put them. Failing to report a single-shot checkout costs a nudge; reporting a
  cursor tells the user to write code that cannot work.

- **`const fn = client.query` is an escape, not a single-shot query.** The rule's
  own coverage test used to assert a report here. It was wrong: the method is
  extracted and handed elsewhere, so how often it runs is not knowable from this
  file — the same reason `doSomething(client)` abstains.

## Deliberately out of scope

- **A checkout with no `release()`** — that is `no-missing-client-release`.
- **A double `release()`** — that is `prevent-double-release`.
- **`pool.connect((err, client, done) => …)`**, the deprecated callback form.
  Not a declarator; no evidence collected.
- **`this.client = await this.pool.connect()`** — the handle escapes the
  function, so its lifetime is not knowable here.

## Adversarial wave

Fixtures `vulnerable/09–11` and `safe/12–15` were written after the rule first
scored 100%, aimed at the two new guards from both directions: a lock-shaped
statement that must still report, formatting that must not change a verdict, a
session statement in a different argument form, a different advisory-lock
spelling, and a callback boundary reached through a user-written helper rather
than an array method. The rule held at **100%**.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before | 8 | 6 | 0 | 57.1% | 100% | 72.7% |
| after | 11 | 0 | 0 | 100% | 100% | **100%** |
