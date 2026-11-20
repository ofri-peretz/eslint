---
'eslint-plugin-node-security': patch
---

fix: two false positives found by linting Vite

`detect-eval-with-expression` no longer reports `Function('return this')()`, the portable global-object probe (also `return globalThis`, with an optional strict-mode prologue). It has a fixed body and no parameters. Any other literal body, and anything assembled at runtime, still reports.

`no-math-random-crypto` no longer reports a binding whose name is an everyday identifier word (`hash`, `key`, `code`) when every read of it lands in a file name, such as a timestamped temp-file suffix: a path argument of a `path.*` or `fs.*` call (not file content), or a template that ends up in one or in a file-named binding (a `.ext` suffix alone, as in an HMAC key, is not enough). A strong secret name (`token`, `salt`, `nonce`, ...), a binding also used for anything else, and a binding nothing reads still report.
