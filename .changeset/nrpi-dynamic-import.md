---
'eslint-plugin-import-next': minor
---

fix(import-next): `no-relative-parent-imports` sees a dynamic `import('../x')`

`import x from '../y'` reported and `require('../y')` reported, but
`import('../y')` — the same climb out of the directory — was silent. The
`CallExpression` visitor carried a comment claiming otherwise:

```
// Note: Dynamic imports (import()) are handled by ImportExpression visitor
```

There was no such visitor. Sibling rules `no-relative-packages` and
`no-absolute-path` both implement one, and upstream `eslint-plugin-import`,
which this rule's messages link as documentation, registers `ImportExpression`
through `moduleVisitor` and does report the dynamic form. Nothing in the docs
scopes the rule to static declarations, and `commonjs` is on by default, so
"static ESM only" was never the design.

**This rule now reports where it did not before.** A lazily loaded parent
module is a finding, at the same message and severity as its static twin.
Computed specifiers — `import(name)` — stay silent, as they already do for
`require`.
