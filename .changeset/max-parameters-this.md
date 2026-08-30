---
'eslint-plugin-maintainability': patch
---

fix: `max-parameters` no longer counts TypeScript's `this` parameter

`function f(this: Window, a, b, c, d)` takes **four** arguments. The `this`
parameter is a type annotation for the calling context — erased before emit,
never passed by a caller — so counting it inflated the arity by one and
reported a function sitting exactly at the limit.

This matches `@typescript-eslint/max-params`, whose `countVoidThis` option
defaults to `false` for the same reason.

Nothing else changes: rest and defaulted parameters still count, one
destructured object still counts as one, and five real parameters still report
whether or not a `this` annotation is present.
