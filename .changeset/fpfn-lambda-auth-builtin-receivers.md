---
'eslint-plugin-lambda-security': patch
---

fix(lambda-security): `no-missing-authorization-check` ignores built-in receivers

`Object.create(...)` and `cache.delete(key)` on a `new Map()` were reported as
privileged operations because the operation was matched on the method name alone.
Standard-library namespaces (`Object`, `Reflect`, `JSON`, …) and bindings initialised
with `new Map()` / `new Set()` / `new WeakMap()` / `new WeakSet()` are now skipped;
any other receiver still reports.
