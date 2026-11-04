---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): false negatives found by the Quint fidelity models.

- `check-query-params`, `no-select-all`, `no-floating-query`, `no-unsafe-search-path`, `no-unsafe-copy-from`, `no-batch-insert-loop` and `prefer-pool-query` read a string-subscript call (`pool['query'](…)`, `pool['connect']()`, `client['release']()`, `items['forEach'](…)`, `.then`/`['catch']` chains) as the same method. Each used to skip it.
- `check-query-params` reports `$n` placeholders sent with no values at all: no second argument, only the result callback, or a `{ text }` config with no `values`. pg sends the statement unbound and the server rejects it ("there is no parameter $1"). `PREPARE … AS … $1` is still not reported.
- `no-insecure-ssl` reads `sslmode=no-verify` appended to a URL in a template (`` `${process.env.DATABASE_URL}?sslmode=no-verify` ``), not only in a string literal.
