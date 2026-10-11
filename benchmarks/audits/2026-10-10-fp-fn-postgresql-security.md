# FP/FN fixes — eslint-plugin-postgresql-security (2026-10-10)

The 2026-10 review of `eslint-plugin-postgresql-security` 2.3.5 found 16 false positives and 17 false negatives across the 13 rules. Every finding was reproduced against the published package before it was fixed.

Every fix followed the same steps, test first:

1. Add a valid case (for an FP) or an invalid case (for an FN) to the rule's `*.test.ts`.
2. Run it and see it fail on the unfixed code.
3. Fix the rule.
4. Run it and see it pass.

All new cases live in a `describe('<rule> — fp/fn review 2026-10')` block at the end of each rule's test file. Fixes are AST-structural only: nothing is tracked through data flow, and nothing is guessed from a variable name.

Gates, all run in `packages/eslint-plugin-postgresql-security`, all green:

- `npx vitest run`: 39 files, 1409 tests.
- `npx vitest run --coverage`: 100% statements, branches, functions and lines, which is the package threshold.
- `npm run typecheck`.

## Findings

All test names below sit under the rule's `fp/fn review 2026-10` block.

| Finding                                                                                                | FP/FN    | Status                                        | Test name                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| UQ-1 `$${params.length}` placeholder-index builder reported                                            | FP       | fixed                                         | `UQ-1: a placeholder index is not data`                                                                                     |
| UQ-2 safe fragment bound to a `const` first (`placeholders`, `valuesSql`, `col = escapeIdentifier(…)`) | FP       | fixed                                         | `UQ-2 and UQ-5: a safe fragment bound to a const first`                                                                     |
| UQ-3 `const` object members and TS enum members                                                        | FP       | fixed                                         | `UQ-3: constant object members and enum members fold`                                                                       |
| UQ-4 fragments keyed by name leak into another function's `sql` parameter                              | FP       | fixed                                         | `UQ-4: query fragments are tracked per binding, not per name`                                                               |
| UQ-5 provably numeric `LIMIT ${Math.min(Number(x) …)}`                                                 | FP       | fixed                                         | `UQ-2 and UQ-5: …` and `UQ-6: …` (valid cases)                                                                              |
| UQ-6 any call inside `${}` exempt (`.join`, `.trim`, `String()`)                                       | FN       | fixed                                         | `UQ-6: only a closed list of calls is an escaper`                                                                           |
| UQ-7 receiver imported from a local `db` module, file never imports `pg`                               | FN       | **deferred** (cross-plugin SDK gate contract) | `UQ-7: a receiver imported from a local db module (deferred)` (`GAP:` cases)                                                |
| UQ-8 pg-promise `any/one/none/…` and postgres.js `sql.unsafe` sinks                                    | FN       | fixed                                         | `UQ-8: pg-promise and postgres.js sinks`                                                                                    |
| UQ-9 `{ text }` shorthand naming a built variable                                                      | FN       | fixed                                         | `UQ-9..12: …` › `UQ-9: { text } shorthand naming a built variable`                                                          |
| UQ-10 `sql = …` / `q = q + …` reassignment                                                             | FN       | fixed                                         | `UQ-9..12: …` › `UQ-10: …` (3 cases)                                                                                        |
| UQ-11 multi-statement local builder ending in `return q`                                               | FN       | fixed                                         | `UQ-9..12: …` › `UQ-11: a builder with more than one statement`                                                             |
| UQ-12 `new Cursor(sql)`, `LISTEN`/`NOTIFY`/`CALL`                                                      | FN       | fixed                                         | `UQ-9..12: …` › `UQ-12: …` (4 cases)                                                                                        |
| SSL-1 conditional `ssl: isProd ? { rejectUnauthorized: false } : false`                                | FN       | fixed                                         | `SSL-1: a conditional ssl value`                                                                                            |
| SSL-2 postgres.js / pg-promise / local config factory / `PoolConfig`-typed object                      | FN       | fixed (cross-file remainder deferred)         | `SSL-2: configs not written inline in new Pool()`                                                                           |
| CRED-1 password-bearing DSN constant in a config module                                                | FN       | fixed                                         | `CRED-1: a DSN with a password anywhere in the file`                                                                        |
| CRED-2 postgres.js / pg-promise credentials                                                            | FN       | fixed                                         | `CRED-2: postgres.js and pg-promise factories`                                                                              |
| check-query-params message dropped the counts                                                          | cosmetic | fixed                                         | `the message carries the counts it was given`                                                                               |
| REL-1 imported / injected / typed pool                                                                 | FN       | fixed (gate remainder deferred)               | `REL-1: imported, injected and typed pools`                                                                                 |
| REL-2 lending the client to any helper silenced the rule                                               | FN       | fixed                                         | `REL-2: passing the client to a helper is not handing it off`                                                               |
| REL-3 release in `try` plus in its `catch` reported as not guaranteed                                  | FP       | fixed                                         | `REL-3: released in the try and in its catch covers every path`                                                             |
| DR-1 `done()` in if/else or `?:` branches                                                              | FP       | fixed                                         | `DR-1: done() in mutually exclusive branches`                                                                               |
| DR-2 retry loop re-checking out a client                                                               | FP       | fixed                                         | `DR-2: a retry loop checks out a NEW client each pass`                                                                      |
| DR-3 release ending the `try` plus a `catch` release                                                   | FP       | fixed                                         | `DR-3: release at the end of the try, then in its catch`                                                                    |
| TX-1 injected / typed / checkout-proven pool                                                           | FN       | fixed (untyped-import remainder deferred)     | `TX-1: injected, typed and checkout-proven pools`                                                                           |
| TX-2 single `BEGIN; …; COMMIT` string                                                                  | FP       | fixed                                         | `TX-2: one multi-statement string runs on one connection`                                                                   |
| FQ-1 callback API `pool.query(text, values, cb)`                                                       | FP       | fixed                                         | `FQ-1 and FQ-2: calls that return no promise to float`                                                                      |
| FQ-2 supertest `.query({ page })` in a pg-importing test (floating and batch-loop rules)               | FP       | fixed                                         | `FQ-1 and FQ-2: …`; batch-loop `FQ-2: a non-pg .query() in a pg-importing test file`                                        |
| SA-1 `SELECT *` over a CTE or derived table                                                            | FP       | fixed                                         | `SA-1: * over a relation whose columns are already explicit`                                                                |
| BIL-1 chunked `unnest` / `%L` batches (the rule's own fix)                                             | FP       | fixed                                         | `BIL-1: an already-batched statement in a chunk loop`                                                                       |
| BIL-2 keyset pagination in `for (;;)`                                                                  | FP       | fixed                                         | `BIL-2: keyset pagination in for(;;)`                                                                                       |
| BIL-2b migration runner `client.query(fileContents)` in a loop                                         | FP       | deferred                                      | —                                                                                                                           |
| BIL-3 per-row write in `.map` / `Promise.all(map)` / `Array.from` (the docs' own Incorrect example)    | FN       | fixed                                         | `BIL-3: a write inside .map() is one round trip per element`; `BIL-3: a per-row UPDATE through allSettled(map) is reported` |
| SP-1 allowlist check in an `asserts` helper                                                            | FP       | fixed                                         | `SP-1: validated by an asserts helper before the sink`                                                                      |
| SP-3 `set_config('search_path', $1)` with a request value; `-c search_path=` pool option               | FN       | fixed                                         | `SP-3: set_config and per-connection options`                                                                               |
| CF-1 `COPY … TO '<user path>'` (server-side file write)                                                | FN       | fixed                                         | `CF-1: COPY … TO a server path is a file WRITE`; no-unsafe-query `CF-1: COPY ... TO a user path`                            |

Counts:

- **FP:** 16 reported, 16 fixed. BIL-2b is a sub-shape of BIL-2 and is deferred.
- **FN:** 17 reported, 16 fixed, 1 deferred (UQ-7). The cross-file remainders of four of the fixed ones are also deferred (see below).

### Existing tests changed, and why

- **`prevent-double-release.test.ts`, case "release on both the success and the catch path".** This case and two `index.spec.ts` cases ("Try + Catch both release", "Try block release + catch block release") ended the `try` block with the release. That shape never releases twice, so it was DR-3 itself. Each fixture now has a statement after the release, which is the real hazard. The original shape is pinned as valid under DR-3.
- **`no-batch-insert-loop.test.ts`, valid case `Promise.allSettled(skus.map(s => pool.query('UPDATE …')))`.** This case encoded BIL-3: one UPDATE per element, whatever awaits the array. It moved to an invalid case. Read-only `Promise.all(ids.map(… SELECT …))` stays valid, preserving the documented concurrency trade-off.
- **`no-batch-insert-loop` FQ-2 guard.** The guard skips only objects with none of `text` / `values` / `name`. The existing invalid case `pool.query({ values: [i] })` inside a loop therefore still reports.

## Deferred

UQ-7 is deferred on a project decision rather than on the design constraint:

- **UQ-7: a route file that reaches PostgreSQL only through a local `./db` wrapper.** Reason: **cross-plugin SDK gate contract.** `benchmarks/__tests__/sdk-gate-coverage.lock.test.ts` requires every SQL-driver plugin (postgresql-, mysql-, sqlite-security, …) to stay silent in a file with no SDK evidence, so the same line is never billed twice. Generic SQL injection there belongs to `secure-coding/no-sql-injection`. A widening was implemented and then reverted on that decision. The in-package lock fixture "an HTTP API named like a database" keeps its original expectation, and the shape is pinned as `GAP:` valid cases. pg-promise and postgres.js remain sinks wherever their import provides the evidence.

Each item below needs data flow or cross-file resolution, which the design constraint rules out.

1. **TX-1 remainder: an untyped `import { pool } from './db'` with no kept `.connect()` in the file.** No structural signal in the file separates an exported `Pool` from an exported single `Client`, and `BEGIN` on a single `Client` is correct. The handle is recognised when either:
   - it is declared with pg's `Pool` type, or
   - the same file does `const c = await pool.connect()`. A pg `Client#connect` resolves to nothing, so a kept checkout proves a Pool.

   Telling them apart otherwise needs cross-file resolution of `./db` or a guess from the name `pool`.

2. **REL-1 / TX-1 remainder: a file that imports its pool from a local module and imports nothing from `pg`.** Same reason as UQ-7: the cross-plugin SDK gate contract. Opening the gate on `.connect()` alone would also restore the mongoose, redis and broker false positives it was built to remove.
3. **SSL-2 / CRED remainder: configs imported from another module or a JSON file.** The values cannot be read without cross-file resolution. Same-file factories, `PoolConfig`-typed objects and DSN literals anywhere in the file are covered.
4. **UQ-11 remainder: query builders imported from another module.** Cross-file. Local builders, including multi-statement `return q` builders, are followed.
5. **BIL-2b: a migration runner, `for (const f of files) await client.query(await fs.readFile(f))`.** Telling "different DDL per iteration" apart from "the same statement per row" needs knowledge of what the variable holds. The documented path is an `eslint-disable` comment on the runner.
6. **Not changed, by design: SP-2.** `no-unsafe-search-path` still reports `SET search_path TO ${escapeIdentifier(tenant)}` and `format('… %I', tenant)`. Quoting stops injection but not hijacking (CWE-426), and the rule's rationale for this is explicit in source. The allowlist guard and, new here, an `asserts` guard helper are the accepted remediations.

Known residual risk:

- **UQ-1.** An identifier directly after a lone `$` (`$${n}`) is accepted as a placeholder index. Members, strings, logical expressions and division are not. `$${req.query.n}` and `$${a / b}` are still reported. `$$${body}$$` dollar-quoting is excluded.
- **`uq-fn-patch-keys`.** A PATCH builder that takes column names from `Object.entries(req.body)` is still reported, but only through `${sets.join(', ')}`, because `.join` on a plain array is no longer an escaper. Before the fix it was caught only by accident, through the `$${values.length}` index.

## Preset changes (`recommended`)

| Rule                     | Before | After    | Justification                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-floating-query`      | error  | **warn** | It reported every callback-style `pool.query(text, values, cb)` (FQ-1) and a non-pg `.query({…})` chain in pg-importing tests (FQ-2). Both are fixed. The rule still matches on the method name `query` without types, and teams on TypeScript already get `@typescript-eslint/no-floating-promises`, which is type-aware. An unhandled rejection is a reliability defect, not an exploitable one, so `warn` fits.            |
| `prevent-double-release` | error  | **warn** | The rule declares `confidence: 'medium'` in its own metadata. Three FP shapes reproduced on idiomatic code (DR-1, DR-2, DR-3), and DR-3 double-reported, together with `no-missing-client-release`, a function that releases on every path. The shapes are fixed, but the rule is a path heuristic without control-flow analysis, and an `error` on a medium-confidence heuristic is how a security preset gets switched off. |

Unchanged:

- `strict` (every rule `error`) and `flagship` (`no-unsafe-query` only).
- `check-query-params`, `no-select-all`, `prefer-pool-query` and `no-batch-insert-loop`, which already warned. Their docs said "errors" and now say "warns".

Side fix: `no-missing-client-release` reported its resource leak (CWE-404) as `OWASP A05:2025` (Injection). It now uses `A10:2025`, Mishandling of Exceptional Conditions.
