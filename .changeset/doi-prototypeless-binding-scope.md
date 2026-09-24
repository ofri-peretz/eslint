---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): detect-object-injection resolves the Object.create(null) exemption by scope

The null-prototype exemption matched any `const`/`let` of the same NAME in an enclosing block, so a
parameter shadowing an outer `const store = Object.create(null)` had its `store[key] = value` writes
silenced, and so did a binding reassigned to `{}` after declaration. The binding is now resolved through
scope and a reassignment disqualifies it, as the rule's other bindings already do.
