---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): wrong verdicts in three rules surfaced by Stryker mutation testing

- `no-missing-client-release` no longer reports a release as not guaranteed when an early `return` (or a `return` / `break` / `continue` in the catch) gives the client back first: `if (!r.rows.length) { client.release(); return null; }`.
- `prevent-double-release` no longer reports a release that is followed by `return` or `throw` in its own block as the first of two — the early return of a handler, in a loop or before a release after the `try`. Inside a `try … catch` (this function's or an enclosing one) only a `return` of an already-computed value leaves; a `throw`, or `return compute()`, is caught and still reported.
- `prevent-double-release` reports a release in the `else` branch of an `if` followed by another release after the `if`, and a release in an `if` followed by `return client.release()`.
- `prevent-double-release` accepts the callback form's `if (err) return done(err);` as releasing and leaving.
- `no-unsafe-query` recognises a statement behind leading SQL comments (`/* controller:users */ SELECT …`, `-- note`), reports a `for…of` over a constant column array that request data was pushed into or written over, and accepts a same-file helper that escapes its argument (`const lit = (v) => format('%L', v)`).
- The release-shape oracle (`spec/pg-release.qnt`, `src/rules/release-paths.test.ts`) now covers an early return that releases first: 80 shapes.
