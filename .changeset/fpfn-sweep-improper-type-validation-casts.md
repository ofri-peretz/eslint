---
'eslint-plugin-secure-coding': patch
---

fix: `no-improper-type-validation` no longer loses a null guard to a type-only cast. `as`, `satisfies`, `<T>x` and `x!` erase at compile time, so `(payload as object) !== null && typeof payload === 'object'` is the same program as the un-cast form the rule already accepts — and is the docs' own ✅ Correct example. Comparing guard operands by node type made the verdict turn on the spelling of a no-op.
