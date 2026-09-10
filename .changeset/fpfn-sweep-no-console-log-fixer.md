---
'eslint-plugin-operability': patch
---

fix: `no-console-log`'s `remove` and `comment` strategies no longer change control flow

`findParentStatement` climbs to the nearest `ExpressionStatement`, `ReturnStatement` _or_
`VariableDeclaration`, so `return console.log(x)` lost its early return and
`export const o = { m: () => console.log(x), other }` lost the whole exported object. And
when the statement was the braceless body of an `if` / `else if` / `while` / `for`, removing
it left the branch headless and silently absorbed the following statement into it.

All of it still parses and still type-checks, so nothing surfaces. `fixable: 'code'` means
safe to apply unattended, and the docs recommend `--fix` in CI, so both statement-level
strategies now decline instead: they fix only when the statement is exactly the
`console.log` call and sits in a statement list. The report itself is unchanged, and
`convert` / `warn` — which replace only the callee — were never affected.
