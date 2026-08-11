---
'eslint-plugin-node-security': patch
---

detect-suspicious-dependencies: stop reporting real packages as typosquats

Edit distance alone cannot separate a typosquat from a package that merely has
a similar name. At distance ≤ 2 the rule reported `preact` (one edit from
`react`, and a deliberate dependency of okta/okta-signin-widget) and `recast`
(two edits, the AST library jscodeshift is built on).

Two changes. The threshold drops to a single edit, and the distance function
now counts a transposition as one edit (Damerau) rather than two — so `raect`
and `exprses`, the most common squat shape, are caught rather than lost to the
tighter threshold. A short allow-list covers real packages that sit one edit
from a popular name.

Accusing a legitimate dependency of being an attack costs a great deal more
than missing one squat, so a name now has to clear both gates before it is
reported.
