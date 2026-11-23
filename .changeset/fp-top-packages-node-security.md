---
'eslint-plugin-node-security': patch
---

Fix four false positives found linting popular Express/NestJS packages.

- `no-timing-unsafe-compare`: an auth-scheme word (`auth_scheme`, `scheme`) is a public header token, not a secret, and a value bound through a chained assignment (`var id = req.sessionID = read(req)`) is now read as coming from the request, so two client-held copies of one session id are no longer reported as a secret comparison. A real token or HMAC compared with `===` still reports.
- `no-arbitrary-file-access`: a hand-written prefix-containment guard (`(p + sep).substr(0, root.length) !== root`, or its `slice` / `substring` spelling, against a root that provably ends at a separator) is recognised like `startsWith`, and a reject block may log before it returns. An unguarded `readFile(req.query.path)` still reports.
- `detect-eval-with-expression`: a discarded `new vm.Script(source)` inside a `try` whose `catch` tests `instanceof SyntaxError` is a syntax probe, not code execution. A script that is kept, chained to `.runInContext`, or has no such handler still reports.
