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

| Finding                                                                                                | FP/FN    | Status                                | Test name                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| UQ-1 `$${params.length}` placeholder-index builder reported                                            | FP       | fixed                                 | `UQ-1: a placeholder index is not data`                                                                                     |
| UQ-2 safe fragment bound to a `const` first (`placeholders`, `valuesSql`, `col = escapeIdentifier(…)`) | FP       | fixed                                 | `UQ-2 and UQ-5: a safe fragment bound to a const first`                                                                     |
| UQ-3 `const` object members and TS enum members                                                        | FP       | fixed                                 | `UQ-3: constant object members and enum members fold`                                                                       |
| UQ-4 fragments keyed by name leak into another function's `sql` parameter                              | FP       | fixed                                 | `UQ-4: query fragments are tracked per binding, not per name`                                                               |
| UQ-5 provably numeric `LIMIT ${Math.min(Number(x) …)}`                                                 | FP       | fixed                                 | `UQ-2 and UQ-5: …` and `UQ-6: …` (valid cases)                                                                              |
| UQ-6 any call inside `${}` exempt (`.join`, `.trim`, `String()`)                                       | FN       | fixed                                 | `UQ-6: only a closed list of calls is an escaper`                                                                           |
| UQ-7 receiver imported from a local `db` module, file never imports `pg`                               | FN       | fixed (zero-deferral follow-up)       | `cross-file.test.ts` › `UQ-7: a route file importing a local db module that imports pg`                                     |
| UQ-8 pg-promise `any/one/none/…` and postgres.js `sql.unsafe` sinks                                    | FN       | fixed                                 | `UQ-8: pg-promise and postgres.js sinks`                                                                                    |
| UQ-9 `{ text }` shorthand naming a built variable                                                      | FN       | fixed                                 | `UQ-9..12: …` › `UQ-9: { text } shorthand naming a built variable`                                                          |
| UQ-10 `sql = …` / `q = q + …` reassignment                                                             | FN       | fixed                                 | `UQ-9..12: …` › `UQ-10: …` (3 cases)                                                                                        |
| UQ-11 multi-statement local builder ending in `return q`                                               | FN       | fixed                                 | `UQ-9..12: …` › `UQ-11: a builder with more than one statement`                                                             |
| UQ-12 `new Cursor(sql)`, `LISTEN`/`NOTIFY`/`CALL`                                                      | FN       | fixed                                 | `UQ-9..12: …` › `UQ-12: …` (4 cases)                                                                                        |
| SSL-1 conditional `ssl: isProd ? { rejectUnauthorized: false } : false`                                | FN       | fixed                                 | `SSL-1: a conditional ssl value`                                                                                            |
| SSL-2 postgres.js / pg-promise / local config factory / `PoolConfig`-typed object                      | FN       | fixed (remainder closed in follow-up) | `SSL-2: configs not written inline in new Pool()`                                                                           |
| CRED-1 password-bearing DSN constant in a config module                                                | FN       | fixed                                 | `CRED-1: a DSN with a password anywhere in the file`                                                                        |
| CRED-2 postgres.js / pg-promise credentials                                                            | FN       | fixed                                 | `CRED-2: postgres.js and pg-promise factories`                                                                              |
| check-query-params message dropped the counts                                                          | cosmetic | fixed                                 | `the message carries the counts it was given`                                                                               |
| REL-1 imported / injected / typed pool                                                                 | FN       | fixed (remainder closed in follow-up) | `REL-1: imported, injected and typed pools`                                                                                 |
| REL-2 lending the client to any helper silenced the rule                                               | FN       | fixed                                 | `REL-2: passing the client to a helper is not handing it off`                                                               |
| REL-3 release in `try` plus in its `catch` reported as not guaranteed                                  | FP       | fixed                                 | `REL-3: released in the try and in its catch covers every path`                                                             |
| DR-1 `done()` in if/else or `?:` branches                                                              | FP       | fixed                                 | `DR-1: done() in mutually exclusive branches`                                                                               |
| DR-2 retry loop re-checking out a client                                                               | FP       | fixed                                 | `DR-2: a retry loop checks out a NEW client each pass`                                                                      |
| DR-3 release ending the `try` plus a `catch` release                                                   | FP       | fixed                                 | `DR-3: release at the end of the try, then in its catch`                                                                    |
| TX-1 injected / typed / checkout-proven pool                                                           | FN       | fixed (remainder closed in follow-up) | `TX-1: injected, typed and checkout-proven pools`                                                                           |
| TX-2 single `BEGIN; …; COMMIT` string                                                                  | FP       | fixed                                 | `TX-2: one multi-statement string runs on one connection`                                                                   |
| FQ-1 callback API `pool.query(text, values, cb)`                                                       | FP       | fixed                                 | `FQ-1 and FQ-2: calls that return no promise to float`                                                                      |
| FQ-2 supertest `.query({ page })` in a pg-importing test (floating and batch-loop rules)               | FP       | fixed                                 | `FQ-1 and FQ-2: …`; batch-loop `FQ-2: a non-pg .query() in a pg-importing test file`                                        |
| SA-1 `SELECT *` over a CTE or derived table                                                            | FP       | fixed                                 | `SA-1: * over a relation whose columns are already explicit`                                                                |
| BIL-1 chunked `unnest` / `%L` batches (the rule's own fix)                                             | FP       | fixed                                 | `BIL-1: an already-batched statement in a chunk loop`                                                                       |
| BIL-2 keyset pagination in `for (;;)`                                                                  | FP       | fixed                                 | `BIL-2: keyset pagination in for(;;)`                                                                                       |
| BIL-2b migration runner `client.query(fileContents)` in a loop                                         | FP       | fixed (zero-deferral follow-up)       | `BIL-2b: a loop whose SQL text varies per iteration is not a batch`                                                         |
| BIL-3 per-row write in `.map` / `Promise.all(map)` / `Array.from` (the docs' own Incorrect example)    | FN       | fixed                                 | `BIL-3: a write inside .map() is one round trip per element`; `BIL-3: a per-row UPDATE through allSettled(map) is reported` |
| SP-1 allowlist check in an `asserts` helper                                                            | FP       | fixed                                 | `SP-1: validated by an asserts helper before the sink`                                                                      |
| SP-3 `set_config('search_path', $1)` with a request value; `-c search_path=` pool option               | FN       | fixed                                 | `SP-3: set_config and per-connection options`                                                                               |
| CF-1 `COPY … TO '<user path>'` (server-side file write)                                                | FN       | fixed                                 | `CF-1: COPY … TO a server path is a file WRITE`; no-unsafe-query `CF-1: COPY ... TO a user path`                            |

Counts:

- **FP:** 16 reported, 16 fixed. The BIL-2b sub-shape was closed by the zero-deferral follow-up below.
- **FN:** 17 reported, 17 fixed. UQ-7 and the cross-file remainders were closed by the zero-deferral follow-up below.

### Existing tests changed, and why

- **`prevent-double-release.test.ts`, case "release on both the success and the catch path".** This case and two `index.spec.ts` cases ("Try + Catch both release", "Try block release + catch block release") ended the `try` block with the release. That shape never releases twice, so it was DR-3 itself. Each fixture now has a statement after the release, which is the real hazard. The original shape is pinned as valid under DR-3.
- **`no-batch-insert-loop.test.ts`, valid case `Promise.allSettled(skus.map(s => pool.query('UPDATE …')))`.** This case encoded BIL-3: one UPDATE per element, whatever awaits the array. It moved to an invalid case. Read-only `Promise.all(ids.map(… SELECT …))` stays valid, preserving the documented concurrency trade-off.
- **`no-batch-insert-loop` FQ-2 guard.** The guard skips only objects with none of `text` / `values` / `name`. The existing invalid case `pool.query({ values: [i] })` inside a loop therefore still reports.

## Deferred

None. Every item deferred by the first pass was fixed in the zero-deferral follow-up (2026-10-11), under an owner-relaxed design constraint: bounded, cycle-guarded INTRA-FILE value following, plus CROSS-FILE resolution of RELATIVE imports read from disk and parsed with the lint parser. Nothing is inferred from a variable name.

## Zero-deferral follow-up (2026-10-11)

Gates after the follow-up: package `npx vitest run --coverage` — 42 files, 1510 tests, 100% statements, branches, functions and lines; `npm run typecheck` clean; `benchmarks` vitest in full, including `sdk-gate-coverage.lock`, green.

Every case was test-first: added, seen failing on the merged #1188 code, fixed, seen passing. The rule tests named `cross-file: …` lint a real route file next to real modules written to `os.tmpdir()`.

| Former deferral                                                                 | FP/FN | Status | Test name                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UQ-7: a route file reaching PostgreSQL only through a local `../db` wrapper     | FN    | fixed  | `cross-file.test.ts` › `UQ-7: a route file importing a local db module that imports pg` (FN cases + the mongoose / redis / missing-file valid cases)                       |
| #1 TX-1: an untyped imported handle — Pool or single Client?                    | FN    | fixed  | `cross-file.test.ts` › `TX-1: the imported handle is resolved to Pool or Client`                                                                                           |
| #2 REL-1 / TX-1: a route that imports its pool and nothing from `pg`            | FN    | fixed  | `cross-file.test.ts` › `REL-1: a pool imported from a local db module`, and `TX-1: …`                                                                                      |
| #3 SSL-2 / CRED: configs imported from another module or a JSON file            | FN    | fixed  | `cross-file.test.ts` › `SSL-2: an imported config disables verification`, `CRED: an imported config carries a password`                                                    |
| #4 UQ-11: query builders imported from another module                           | FN    | fixed  | `cross-file.test.ts` › `UQ-7: …` › `FN: an imported multi-statement builder that returns q`, `FN: an imported concise builder …`, `FN: an imported builder that appends …` |
| #5 BIL-2b: a migration runner / a statement that differs per pass               | FP    | fixed  | `no-batch-insert-loop.test.ts` › `BIL-2b: a loop whose SQL text varies per iteration is not a batch`                                                                       |
| Residual UQ-1: `$${n}` accepted for any identifier                              | FN    | fixed  | `no-unsafe-query.test.ts` › `UQ-1 residual: $${n} needs a numeric value behind n`                                                                                          |
| Residual patch-keys: `Object.entries(req.body)` columns caught only via `.join` | FN    | fixed  | `no-unsafe-query.test.ts` › `patch-keys: column names from Object.keys or Object.entries of request data` (also fixes the FP on a SET list pushed from fixed columns)      |

How each is decided:

- **Gate, one relative hop.** `usesPostgres(context)` (`src/utils/index.ts`) keeps the in-file evidence. It also opens when a RELATIVE import resolves to a file on disk that imports `pg` / `pg-pool` / `pg-promise` / `postgres` (or another PG driver), directly or through up to three relative re-export hops. A DSN string in that module is not evidence. The benchmarks lock fixture `import { api } from './api'` has no file on disk, so it stays silent, and the in-package lock fixture keeps its expectation.
- **Cross-file resolution** (`src/utils/cross-file.ts`) handles:
  - `.ts/.tsx/.js/.mjs/.cjs/.json`, `/index.*`, and `./x.js` → `./x.ts`;
  - parsing with `context.languageOptions.parser`, falling back to `@typescript-eslint/parser`;
  - a cache keyed per absolute path and mtime;
  - an abstention, never a throw, on an unreadable or unparseable file.

  Exports read: named and default ESM, `export { a as b }`, re-exports, CommonJS `module.exports` / `exports.x`, and namespace members. JSON is parsed as the default export of a module, so the same AST checks apply.

- **TX-1.** The imported handle is followed to `new Pool()` (reported), `new Client()` (not), or a declaration typed with pg's `Pool` (reported).
- **BIL-2b.** A loop reports only when the statement is iteration-invariant and its parameters vary per pass. A value varies when it comes from the loop header or the callback parameters, is written inside the loop from such a value, or is a call evaluated inside the loop.
- **UQ-1 residual.** The value after a lone `$` must be provably numeric. That means:
  - a number literal, `.length`, `.push(…)`, `Number` / `parseInt` / `parseFloat` / `Math.*`, or arithmetic;
  - a `: number` parameter or binding, or an array callback's index argument;
  - a binding whose every write is one of those.

  An untyped parameter, request data, an undeclared name, a `for…in` key or a `for…of` element over an unknown list is reported.

- **patch-keys.** `${list.join(', ')}` is accepted only when every element `list` is declared with or `.push`ed is fixed text: static text, `$N` indexes, or the element of a `for…of` over a fixed array. Any other use of the array makes it unknowable. A column name from `Object.keys/entries(req.body)` is not fixed text and is reported on its own.

Existing tests changed in the follow-up, and why:

- **`no-insecure-ssl` / `no-hardcoded-credentials`, "more binding hops than the walker follows".** The bound moved from 4 to 8 hops, so the alias chain is now ten long. The case still pins the bound.
- **`no-batch-insert-loop`, `index.spec.ts` (`while(condition)`, `filter`, `reduce`) and the `pool.query(123)` case.** These repeated one constant statement with no parameters. Each now carries a per-pass parameter, which is the one-row-per-round-trip shape the owner's rule reports.
- **`no-batch-insert-loop`, "a statement built by a call with no arguments is unreadable, so reported".** A call in the statement position is not provably the same statement each pass. It moved to valid, and an invariant-statement-with-row-params case replaced it.
- **`no-unsafe-query`, "FP: '$' + (n + 1) …" and "FP: a static template ending in $ …".** These used an undeclared `n` / `i`. That is now (correctly) unproven, so the fixtures declare the index from `values.length`.

## Not a defect

- **SP-2 (`no-unsafe-search-path`).** `SET search_path TO ${escapeIdentifier(tenant)}` and `format('SET search_path TO %I', tenant)` are reported, and that is correct. Quoting stops injection, but CWE-426 is about which schema the caller selects, and a quoted attacker-chosen schema still shadows every function the session calls. The accepted remediations are an allowlist guard before the sink: an inline `if (…) throw/return`, or an `asserts` helper. The rule docs now say this instead of listing it as a known false negative.

## Preset changes (`recommended`)

| Rule                     | Before | After    | Justification                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-floating-query`      | error  | **warn** | It reported every callback-style `pool.query(text, values, cb)` (FQ-1) and a non-pg `.query({…})` chain in pg-importing tests (FQ-2). Both are fixed. The rule still matches on the method name `query` without types, and teams on TypeScript already get `@typescript-eslint/no-floating-promises`, which is type-aware. An unhandled rejection is a reliability defect, not an exploitable one, so `warn` fits.            |
| `prevent-double-release` | error  | **warn** | The rule declares `confidence: 'medium'` in its own metadata. Three FP shapes reproduced on idiomatic code (DR-1, DR-2, DR-3), and DR-3 double-reported, together with `no-missing-client-release`, a function that releases on every path. The shapes are fixed, but the rule is a path heuristic without control-flow analysis, and an `error` on a medium-confidence heuristic is how a security preset gets switched off. |

Unchanged:

- `strict` (every rule `error`) and `flagship` (`no-unsafe-query` only).
- `check-query-params`, `no-select-all`, `prefer-pool-query` and `no-batch-insert-loop`, which already warned. Their docs said "errors" and now say "warns".

Side fix: `no-missing-client-release` reported its resource leak (CWE-404) as `OWASP A05:2025` (Injection). It now uses `A10:2025`, Mishandling of Exceptional Conditions.
