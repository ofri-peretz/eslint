---
'eslint-plugin-mongodb-security': patch
---

`require-projection` and `require-lean-queries` no longer report
`Array.prototype.find`.

Both rules keyed off the method name alone — any `X.find(...)`, `X.findOne(...)`
or `X.findById(...)` — with no check that the receiver was a MongoDB handle. A
plain `[1, 2, 3].find((x) => x === 2)` in a file containing no MongoDB reported
CWE-200. Both rules are in `recommended`, so every consumer got an error on
every `Array.prototype.find` in their codebase.

Measured by running the whole published ruleset over the Interlace monorepo,
which uses no MongoDB: **115 findings each, all false positives**, including one
on a React component doing `pluginStats.plugins.find((p) => p.name === …)`.

The plugin already had the fix: `analyzeMongoScope().isModelReceiver()` exists
precisely because "method names alone are hopeless discriminators", and five
sibling rules use it. These two never adopted it. They now do, ordered after the
cheap syntax checks so the receiver analysis only runs on a candidate call.

Locked with the array cases as `valid` in both rules — verified by reverting the
gate and watching them report again.

True positives are unaffected: `db.collection('users').find({})` and
`User.find({ active: true })` still report.
