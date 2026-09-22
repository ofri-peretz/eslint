---
'eslint-plugin-maintainability': patch
---

fix: `consistent-function-scoping` told a module-scope function to move to module scope

A function bound by assignment rather than by declaration was reported even when it already sat at the top level of a module:

```ts
export const control = (): number => 1; // silent — correct
api.direct = (): number => 1; // REPORTED "can be moved to higher scope"
```

Same scope, same body, same capture set — the verdict turned purely on how the binding was spelled. Both arms of a module-scope ternary, and a module-scope logical fallback, reported for the same reason.

The rule's fix text is "Move function declaration to module scope" and its doc says "Move functions to the highest possible scope". Module scope _is_ the highest, so the advice was impossible to act on. The rule already holds the principle — its own guard is commented "Already at the top scope, so there is nowhere to move it" — but the walk that reaches it only stepped over `VariableDeclarator`, `VariableDeclaration` and the four TypeScript type operators, so an `AssignmentExpression`, `ConditionalExpression` or `LogicalExpression` stopped it short of `Program`.

This is the same defect as the type-operator case that guard was previously extended for, one node type over. `ExpressionStatement`, `AssignmentExpression`, `ConditionalExpression` and `LogicalExpression` join `BINDING_WRAPPERS`: like the declarator and the type operators, they can sit between a function and its scope without moving it.

Surfaced at burgee `packages/burgee/src/yargs-parser.ts:899`, two lines below a function expression in the same scope that the rule correctly left alone.

Deliberately narrow: this only affects whether the walk reaches `Program`. A function nested inside another function still meets a function or block ancestor first, so it still reports — pinned by the 51 pre-existing cases in the rule's test file, every one of which is a nested function and all of which still pass.

Four fixtures failed before the fix and pass after.
