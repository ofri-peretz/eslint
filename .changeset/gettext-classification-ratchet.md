---
'@interlace/eslint-devkit': patch
---

Add a ratchet against classifying code by regexing printed source.

A rule that runs `.test()` / `.includes()` / `.match()` over
`sourceCode.getText(node)` is guessing. Printed text carries identifiers,
comments and whitespace — everything the parser already separated out — so a
match says nothing about structure. It has produced defects in both directions,
both measured:

- **False positives.** `no-xpath-injection` matched `render.text() + input` (an
  identifier) and a `/* //user[@id] */` comment as XPath construction.
- **Self-suppression.** `express-security/require-route-authentication` matched
  `require(...)` against its auth-middleware list, so
  `app.use(require('body-parser'))` marked the file globally authenticated and
  silenced **every route in it** (#313). This direction is the dangerous one —
  the rule scores a perfect false-positive rate while protecting nothing.

`npm run audit:gettext` counts the sites and fails when the number grows. The
current **205 sites across 61 files** are baselined, not fixed; this stops the
class expanding while it is burned down. Runs in the aggregate quality gate.

Nothing about rule behaviour changes.
