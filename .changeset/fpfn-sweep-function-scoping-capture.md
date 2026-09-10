---
'eslint-plugin-maintainability': patch
---

fix: `consistent-function-scoping` sees destructured bindings and `this`

The scope tracker recorded only plain `Identifier` binding targets, so `const { out } = opts`
and `function f({ out })` bound nothing as far as the rule was concerned. A nested function
capturing one looked as though it captured nothing, and the report asserted "doesn't capture
outer variables" about code where ESLint's own scope manager resolves the reference to the
enclosing function — with a suggested move that does not compile.

An arrow also captures `this` lexically. The rule already exempted `MethodDefinition` and
`PropertyDefinition` because they are "bound to the instance and cannot be moved to module
scope", but that exemption never reached an arrow nested _inside_ a method — so the rule was
backwards on the axis it says it cares about. Arrows only: a nested `function` declaration's
`this` is dynamic, so hoisting it and calling it with `.call(this)` works, and that report
stays.
