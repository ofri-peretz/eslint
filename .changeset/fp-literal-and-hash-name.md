---
'eslint-plugin-secure-coding': patch
'eslint-plugin-node-security': patch
---

fix: four false positives found by scanning real repositories.

`no-improper-sanitization` reported every string literal nested inside an
array in a response payload. The safety walk already climbed through arrays,
but the check that decides whether the composed text is developer-authored
did not handle `ArrayExpression`, so the literal fell through to a test that
asks only whether it contains a dangerous _character_ — and `'` is one.
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

`no-hardcoded-credentials` reported OAuth route paths as CRITICAL CVSS 9.8
hard-coded credentials tagged SOC2/PCI-DSS/HIPAA/GDPR. Two checks have to
agree before it fires and both said yes for the wrong reason: the property
name ends in `token`, and slashes plus digits clear the two-character-class
shape test. `isSecretShaped` now rejects a URL or an absolute path — an
endpoint is the address of a secret, not the secret. Connection strings are
unaffected: `protocol://user:pass@host` is matched structurally before shape
is consulted, and the new guard refuses any URL carrying userinfo.

`no-math-random-crypto` reported `generateRequestId` — the log-correlation id
factory in arangodb/arangojs, and the single finding in that whole repository.
`/generate.*id/i` is the loosest entry in its function-name list and matches
the most common identifier factory in Node. An id qualified by a correlation
word (`request`, `trace`, `span`, `message`, `element`…) is now subtracted, in
the shape the rule already uses for `code` and `key`. `generateSessionId` and
`generateId` still report.

Review found two residual gaps in the first pass of these fixes, both closed
here. Skipping every locally-defined helper in `no-weak-hash-algorithm` opened
a false negative — a local `sha1()` that really calls `createHash("sha1")`,
feeding a session token, went silent in the default mode. The skip is now gated
on `createHmac` evidence rather than on the binding being local. And
`no-improper-sanitization` still reported when a JSON primitive sat beside the
string, because `isSafeText` accepted only strings: `res.json([{ id: 1, text:
"You don't have permission" }])` was still a finding. Numbers, booleans, `null`
and array holes cannot carry markup and are accepted; a regex literal is not,
because its source can.

A second review pass found both narrowing guards still too wide. The
correlation-id subtraction in `no-math-random-crypto` suppressed
`generateRequestTokenId`, which carries `token` and matches
`/generate.*token/i` on its own; a crypto word anywhere in the name now
outranks the correlation word. And `no-hardcoded-credentials` treated any
single-slash-prefixed value as a route, so a secret starting with `/` — `/` is
in the base64 alphabet — was suppressed before the shape checks ran. A route is
made of route-shaped segments, and a lone segment mixing case and digits is a
key rather than a path.
