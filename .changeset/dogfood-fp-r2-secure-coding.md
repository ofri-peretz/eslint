---
'eslint-plugin-secure-coding': patch
---

fix: second round of false positives, and copied session secrets now reported

`no-insecure-comparison` no longer reports `"function" == typeof x` (two strings) or a secret-named member compared with a `const` bound to a literal. `no-improper-type-validation` reads `!!x` and `Boolean(x)` as a null guard. `no-unchecked-loop-condition` no longer reports loops over `multiValueHeaders` / `rawHeaders`. `no-unsafe-deserialization` skips a receiver reached through a `transformer` property.

`no-hardcoded-credentials` now reports well-known copied session secrets (`keyboard cat`, `changeme`, `your-secret-key`, ...) even with `allowPlaceholders` on, follows a `const` options object passed to the session middleware, and covers `@fastify/session` / `fastify-session`. New option `knownSessionSecrets` replaces the built-in list.
