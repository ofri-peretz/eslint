---
'eslint-plugin-postgresql-security': minor
---

fix(postgresql-security): close every deferred FP/FN — cross-file gate, imported pools, configs, builders

Follow-up to the 2026-10 FP/FN review: every item it deferred is now fixed, and the audit's Deferred section is empty (benchmarks/audits/2026-10-10-fp-fn-postgresql-security.md).

- **Gate, one relative hop.** A file that reaches PostgreSQL only through a relative import (`import * as db from '../db'`) is linted when that module, or a short chain of relative re-exports, imports `pg`, `pg-pool`, `pg-promise` or `postgres`. A relative import with nothing on disk behind it, or a `../db` that imports mongoose or redis, keeps every rule silent. This applies to all 13 rules.
- **Cross-file value following.** Relative imports (`.ts/.tsx/.js/.mjs/.cjs`, `/index.*`, `./x.js` → `./x.ts`) and JSON files are read from disk, parsed with the lint run's parser (falling back to `@typescript-eslint/parser`), and cached per path and mtime. An unreadable or unparseable module is an abstention, never an error. Within a file, values are followed through bindings, assignments, destructures, member reads, `await`s and same-file returns, bounded at 8 hops and guarded against cycles.
- `no-transaction-on-pool` resolves an imported handle to `new Pool()` (reported) or `new Client()` (not), or to a declaration typed with pg's `Pool`.
- `no-insecure-ssl` and `no-hardcoded-credentials` read configs imported from relative modules (ESM, CommonJS `module.exports`, namespace members) and JSON files.
- `no-unsafe-query` reads query builders imported from relative modules. `$${n}` is accepted as a placeholder index only when `n` is provably a number. A SET list pushed from fixed `column = $N` text is no longer reported, while column names from `Object.keys/entries(req.body)` are.
- `no-batch-insert-loop` reports only an iteration-invariant statement whose parameters vary per pass. A migration runner or a list of distinct statements is not a batch insert.

No preset changes.
