---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): stop reporting correct releases after a `try … catch`

`no-missing-client-release` and `prevent-double-release` were checked against a Quint model of every place `client.release()` can sit around one query that may throw (end of the try, catch, finally, after the try; catch absent, swallowing or rethrowing — 40 shapes). Neither rule missed a leak or a double release, but five correct verdicts were wrong:

- `no-missing-client-release` no longer reports a release right after a `try … catch` that every path reaches: a catch that swallows the error falls through to it, and a catch that releases before rethrowing covers its own path. Double releases of that shape are left to `prevent-double-release` instead of also being reported as leaks.
- `prevent-double-release` no longer reports a release in a `catch` that rethrows or returns plus one after the `try`; only one of them runs.

The 40 shapes are now RuleTester cases with expectations from path semantics, and the model is checked in at `packages/eslint-plugin-postgresql-security/spec/pg-release.qnt`.
