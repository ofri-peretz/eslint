---
'eslint-plugin-maintainability': patch
---

fix: `consistent-function-scoping` was silent on a helper capturing only a module-level `const`

`getOuterScopeVariables` unioned every scope below the current one, module scope included, so a nested helper whose only outer reference is a module binding looked captured and the report was withheld. But module scope is the destination the rule suggests moving to — a binding that lives there is equally in scope after the move and cannot be what prevents it.

The rule already knew this: `Program()` deliberately declines to register module-level `function` declarations, with a comment citing burgee `yargs/usage.ts:247`. The `VariableDeclaration` visitor registered module-level `const`/`let` anyway, so the identical helper was reported or suppressed purely by spelling — `function getText(){}` reported, `const SRGB_MAX = 255` silent.

Module scope is now dropped alongside the enclosing one. Bindings from any function scope in between are still counted, so a genuine closure stays silent — pinned by a new valid fixture taken from burgee `packages/flagstaff/src/table.ts:147`, where the captured binding really is local to the enclosing function. Found on burgee `packages/roundel/src/theme.ts:98`, `:131` and `:178`. Nothing pinned the old suppression; on burgee the rule goes 22 to 36 reports, all 14 additions genuinely movable and none lost.
