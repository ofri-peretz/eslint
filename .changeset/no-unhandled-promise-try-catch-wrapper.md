---
'eslint-plugin-reliability': patch
---

fix(reliability): `no-unhandled-promise` no longer reports a call to an in-file `async` function whose whole body is a `try`/`catch` that cannot rethrow

Such a promise cannot reject, so `sendEmail(...)` (found in parse-server's `UserController.js`) is not a floating rejection. A `try`/`finally` with no `catch`, a rethrowing `catch` and code before the `try` are still reported.
