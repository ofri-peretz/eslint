---
"eslint-plugin-lambda-security": patch
---

`no-error-swallowing` no longer reports a catch that handles its error.

The rule detected handling by regexing the block's printed source, so it
missed `next(err)`, `reject(err)` and every response call, while matching any
identifier that merely started with "log" — including inside comments and
string literals. Its return check additionally demanded the returned
expression match `/500|error|fail/`, so `return false` from a hostname
validator read as swallowing.

Detection is now AST-based. A catch handles its error when it logs, forwards
to a callback (`next`, `reject`, `callback`, `done`), answers the request
(`res.status(...)`, `res.end()`), or returns a **fail-closed** value.

Fail-open returns still report, and that distinction is the point:
`catch { return false }` denies, `catch { return true }` grants access on a
malformed token. `true`, a 2xx `statusCode`, `null` and `undefined` are all
excluded from the exemption.

Fixes four false positives in ILB-CWE-Corpus with no loss of true positives.
