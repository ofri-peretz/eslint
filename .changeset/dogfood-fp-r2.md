---
'eslint-plugin-secure-coding': patch
'eslint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-operability': patch
'eslint-plugin-browser-security': patch
---

fix: second round of false positives from linting trpc, Koa, socket.io, axios, cors and body-parser, plus session-secret false negatives

`secure-coding`: `no-insecure-comparison` no longer reports `"function" == typeof x` (two strings) or a secret-named member compared with a `const` bound to a literal; `no-improper-type-validation` reads `!!x` and `Boolean(x)` as a null guard; `no-unchecked-loop-condition` no longer reports loops over `multiValueHeaders` / `rawHeaders`; `no-unsafe-deserialization` skips a receiver reached through a `transformer` property. `no-hardcoded-credentials` now reports well-known copied session secrets (`keyboard cat`, `changeme`, `your-secret-key`, ...) even with `allowPlaceholders` on, follows a `const` options object passed to the session middleware, and covers `@fastify/session` / `fastify-session`.

`reliability` and `maintainability`: `no-missing-error-context` accepts `throw res.error` / `throw this.reason`; `no-await-in-loop` follows a destructured awaited result into the loop exit; `require-network-timeout` skips `*.test.*` / `*.spec.*` files; `no-unreadable-iife` accepts the classic `(function () { ...; module.exports = x; }());` module wrapper.

`operability`: `no-console-log` and `no-debug-code-in-production` treat `*.test.*` / `*.spec.*` files as non-production (`ignoreNonProductionPaths`).

`browser-security`: `no-credentials-in-query-params` allows Google's documented `tokeninfo` GET.
