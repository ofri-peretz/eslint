---
'eslint-plugin-secure-coding': patch
'eslint-plugin-node-security': patch
---

Two false positives found by scanning real repositories.

`no-improper-sanitization` reported every string literal nested inside an
array in a response payload. The safety walk already climbed through arrays,
but the check that decides whether the composed text is developer-authored
did not handle `ArrayExpression`, so the literal fell through to a test that
asks only whether it contains a dangerous *character* — and `'` is one.
`Response.json([{ children: [{ text: "You don't have permission…" }] }])`
was a CWE-116 finding on the apostrophe.

Its message was also wrong: `unsafeReplaceSanitization` is reported from
exactly one place, a string carrying unescaped markup into a sink, and never
from a `replace()` call. It now says what it detected.

`no-weak-hash-algorithm` reported any call to a function named `sha1`, `md5`,
or `md4`, including one defined in the same file. A helper named `sha1` that
computes `createHmac("sha1", secret)` was reported as a CRITICAL CWE-327, and
its suggestion rewrote the call to `sha256(...)` — renaming a local function
out of existence while changing no algorithm. HMAC-SHA1 does not inherit
SHA-1's collision weakness. Calls to locally-defined helpers are now skipped;
whatever the body really uses is still reported where it is written.
