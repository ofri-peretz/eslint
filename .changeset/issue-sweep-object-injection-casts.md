---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): detect-object-injection sees past a TS type-only cast

`isPrototypelessObject` and `hasPrecedingValidation` resolve an identifier's
initializer / key to decide whether a write or an invoked read through it is
safe, but neither unwrapped a TS type-only cast (`as T`, `satisfies T`, the
`<T>x` assertion) first — both are erased at compile time and change nothing
about the value underneath.

Two false positives from this:

- `const target = Object.create(null) as Record<string, number>; target[k] = v;`
  reported CWE-1321 global prototype pollution: the identifier branch of
  `isPrototypelessObject` pattern-matched `declarator.init` against
  `CallExpression` directly, so the cast wrapper made it miss the
  `Object.create(null)` it already recognises without the cast (#1573).
- `if (!Object.hasOwn(WRITERS, kind)) throw ...; WRITERS[kind as keyof typeof WRITERS]();`
  still reported CWE-915 object injection despite the guard:
  `hasPrecedingValidation` required `propertyNode.type === Identifier`
  before reading the key name, so a cast around the key — the standard way
  to narrow a dispatch-table key to its own key union — made it never
  recognise the `Object.hasOwn` guard on the same identifier (#1547, the
  hasOwn-guarded half; the unguarded, type-union-only half of that issue
  needs real TypeScript type-checker information this rule does not have
  and is left open).

Both now unwrap through the existing `withoutTypeAnnotation` helper before
the structural check, the same helper `isLocallyConstructed` already uses
for exactly this reason.
