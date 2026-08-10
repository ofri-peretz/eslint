---
'eslint-plugin-mongodb-security': patch
---

Close the relative-wrapper false negative in the MongoDB evidence gate

The gate shipped in #491 documented one false negative and accepted it: a file
that binds `mongoose` from a **relative** wrapper —
`const mongoose = require('./config/mongoose')` — carries no package specifier,
so every rule abstained. Accepting that was the wrong call. A security rule that
silently stops reporting is precisely the failure this ecosystem exists to
prevent, and "documented" does not make a false negative safe.

The fix is a binding-name arm: an identifier bound as `mongoose` or `Mongoose`,
whatever it was assigned from. The name is safe evidence in a way `db`,
`collection` and `model` are not — those are generic English, `mongoose` is a
product name. Measured over the corpus: **58 files bind that identifier, 57
already import a Mongo package, and the 58th is exactly the missed file.** The
arm opens the gate on one additional file and introduces no other.

It is the *binding name* that counts, not the specifier, so
`import db from './mongoose'` still does not qualify — a module path that merely
ends in `/mongoose` is not evidence about what the file does.

**Recall re-diffed over all 232 corpus files carrying Mongo evidence: 316 → 316
against the pre-gate baseline — zero findings lost**, versus 315 with #491 as
shipped. The recovered finding is `require-auth-mechanism` at
`express-rest-boilerplate/src/index.js:9`.

The lock's "a local module merely named mongoose" negative was the same shape as
the false negative, so it has been **flipped into a positive control** and
replaced with a sharper negative (a relative import whose local name is *not*
`mongoose`).

Two further gaps surfaced while restoring the coverage floor, both now locked:

- `isMongoDynamicLoad` was a nested ternary; it is now early returns, so the
  shadowed-`require` case is its own targeted line rather than a short-circuit
  buried mid-expression.
- with the name arm added, `const mongoose = require('mongoose')` is matched by
  the **name** first and the walk stops, so the require-specifier path is only
  reachable through a differently-named binding. That case
  (`const db = require('mongoose')`) had no test and now does.
