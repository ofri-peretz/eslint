---
'eslint-plugin-conventions': patch
---

fix(conventions): consistent-existence-index-check no longer instructs a rewrite
it refuses to perform.

On a site where converting between the four existence checks would change what
the code does, the rule correctly withholds its autofix — and then emitted
`Fix: Use "Object.hasOwn" instead of "in" for property checks` anyway. Applied to
a duck-type probe of a prototype member, that instruction both fails to compile
(`Object.hasOwn` is declared `boolean`, not a type predicate, so all narrowing is
lost) and inverts the answer at runtime (`'on' in emitter` is `true`,
`Object.hasOwn(emitter, 'on')` is `false`). The rule's own docs say that rewrite
must not happen.

Those sites now carry a separate message naming what actually differs — an
inherited key, method dispatch on the object, or the argument list — instead of
an instruction to rewrite. Which sites report is unchanged.
