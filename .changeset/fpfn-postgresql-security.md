---
'eslint-plugin-postgresql-security': minor
---

fix(postgresql-security): close 16 false positives and 16 false negatives; floating-query and double-release now warn

Fixes 32 of the 33 items from the 2026-10 FP/FN review. Deferred, with reasons: a route file reaching PostgreSQL only through a local `./db` wrapper (the cross-plugin SDK gate contract leaves it to secure-coding), and the remainders that would need cross-file resolution or data flow (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md).

**Preset changes (`recommended`):**

- `postgresql-security/no-floating-query`: `error` → `warn`
- `postgresql-security/prevent-double-release`: `error` → `warn`

Both are path heuristics without control-flow analysis (`prevent-double-release` declares `confidence: 'medium'`), and the review reproduced false positives in each on idiomatic code. Those shapes are fixed; the heuristic class remains. `strict` is unchanged (every rule `error`); `flagship` is unchanged.

**no-unsafe-query.**

- A call inside `${}` is no longer automatically safe. Only a closed list is: pg's `escapeIdentifier` / `escapeLiteral`, anything from `pg-format`, pg-promise's `pgp.as.*`, `Number` / `parseInt` / `parseFloat`, `Math.*`, and a placeholder list ``xs.map((_, i) => `$${i + 1}`).join(',')``. `${ids.join(',')}`, `${email.trim()}` and `${String(x)}` are now reported.
- No longer reported: the `$${params.length}` / `$${i + 1}` placeholder-index idiom, a safe call bound to a `const` first, `const` object members, TS enum members, and a generic `run(sql, params)` helper that shares a variable name with another function.
- Newly reported: pg-promise `db.any/one/none/many/…` and postgres.js `sql.unsafe`; `{ text }` shorthand; `sql = …` and `q = q + …` reassignment; multi-statement local builders ending in `return q`; `new Cursor(sql)`; `CALL` / `LISTEN` / `NOTIFY`; `COPY … TO`.

**no-insecure-ssl.** Reads every branch of `ssl: cond ? { rejectUnauthorized: false } : …` and `&&` / `||`, postgres.js and pg-promise configs, configs returned by a local function, and objects typed as pg `PoolConfig` / `ClientConfig`.

**no-hardcoded-credentials.** Reports a password-bearing `postgres://` DSN anywhere in the file (loopback hosts skipped), plus postgres.js and pg-promise configs.

**no-missing-client-release / no-transaction-on-pool.** Recognise injected and imported pools through a declared pg `Pool` type, or (for release) a `.connect()` whose client runs `.query()`. Lending the client to a helper no longer silences the release rule when the function queries the client itself. A release at the end of a `try` plus one in its `catch` counts as guaranteed. A single `BEGIN; …; COMMIT` string is not reported.

**Other rules.**

- `prevent-double-release` accepts `done()` in opposite if/else or `?:` branches, retry loops that re-check out, and a try-end release paired with a catch release.
- `no-floating-query` skips the callback API and non-pg `.query({ … })` objects.
- `no-batch-insert-loop` skips chunked `unnest` / `%L` / `jsonb_to_recordset` batches and `for (;;)` keyset pagination, and reports per-row writes inside `.map` / `.flatMap` / `Array.from`.
- `no-select-all` allows `*` over a CTE or derived table.
- `no-unsafe-search-path` accepts `asserts` guard helpers and reports dynamic `set_config('search_path', …)` values and `-c search_path=` pool options.
- `no-unsafe-copy-from` reports a dynamic `COPY … TO` target.
- `check-query-params` messages now include both counts.
