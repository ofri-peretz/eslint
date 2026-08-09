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

Removes the rule's findings from four ILB-CWE-Corpus fixtures. The corpus
false-positive total drops from 16 to 13 rather than 4, because
`pipeline-promises.js` is still reported by
`node-security/detect-non-literal-fs-filename` — that fixture builds a read
path straight from `req.params.id`, so the remaining finding is a true
positive against a mislabelled fixture. No true positives lost.
