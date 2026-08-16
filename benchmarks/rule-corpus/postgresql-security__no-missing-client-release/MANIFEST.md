# Rule corpus - `postgresql-security/no-missing-client-release` (CWE-404)

## What the rule owns

A client checked out of a pool and not given back. Every call leaks one
connection; the pool is exhausted after `max` requests and the process then
hangs forever waiting for a free one.

Two findings, because there are two ways to leak:

- `missingClientRelease` — no `release()` anywhere
- `releaseNotGuaranteed` — a `release()` that is not in a `finally`, so an early
  return, a throw, or a rejected query skips it

The second is the one that reaches production, because the happy path always
returns the client and the leak only appears under error.

## What each fixture proves

| fixture | proves |
|---|---|
| `vulnerable/01` | never released at all |
| `vulnerable/02` | released on the happy path only |
| `vulnerable/03` | an early `return` jumps over the release |
| `vulnerable/04` | a `throw` jumps over the release |
| `vulnerable/05` | released in the catch but not on success — every SUCCESSFUL request leaks |
| `vulnerable/06` | a typed `PoolClient`, never released |
| `vulnerable/07` | `handlers.push(client.release)` — referencing the method is not calling it |
| `vulnerable/08` | the pool on `this`, the ordinary repository shape |
| `vulnerable/09` | the release inside a `setTimeout` callback that may never run |
| `vulnerable/10` | released only when the query found something |
| `safe/01`–`02` | the remediation: `try { … } finally { client.release(); }` |
| `safe/03` | `release(true)` destroys the connection — still a release |
| `safe/04` | `pool.query()` checks out and returns automatically |
| `safe/05` | the client handed to a helper that owns the release |
| `safe/06` | `broker.connect()` and `WebSocket.connect()` — no `release()` exists |
| `safe/07` | the client RETURNED, so the caller owns its lifetime |
| `safe/08` | the release in the finally of an OUTER try |
| `safe/09` | the client stored on the instance |
| `safe/10` | an awaited release, and a typed handle |

## Deliberately out of scope

- **Ownership leaving the function** (`safe/05`, `07`, `09`). The standard
  `withClient(client, work)` wrapper exists precisely to guarantee the release,
  so reporting a client passed to a helper fires on the remediation itself.
- **`connect()` on anything that is not a pg Pool** (`safe/06`). A message
  broker and a websocket both have one and neither has a `release()` to call.
- **Destructured checkouts.** There is no client identifier to follow.

## The defects this corpus proved

The rule scored **33.3% F1**. It matched the METHOD NAME `connect` on any
receiver at all, and it asked only whether a `release` call existed *somewhere*:

- `broker.connect()` and `WebSocket.connect(...)` were reported as leaked
  PostgreSQL clients
- a client handed to a helper, or returned to the caller, was reported
- a release on the happy path only was accepted — 4 of 7 vulnerable fixtures
- `handlers.push(client.release)` counted as a release, because the test asked
  whether the member expression's PARENT was a CallExpression, and it is: the
  `push(...)` one

## Adversarial wave

Fixtures 08–10 (both directions) were written after the rule reached 100%. The
score HELD, because the structural rewrite — prove the pool, follow ownership,
require the `finally` — already covered `this.pool`, deferred callbacks and
conditional releases without special-casing any of them.

## A test that asserted a defect as correct behaviour

`coverage-gaps.spec.ts` drove a SYNTHETIC AST to reach a `!variable` guard that
the real parser can never reach — a declarator with an Identifier id always
declares exactly one variable. The guard was dead code. It was removed rather
than tested, and the spec file went with it.
