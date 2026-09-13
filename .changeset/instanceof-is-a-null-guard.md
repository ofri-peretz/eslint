---
'eslint-plugin-secure-coding': patch
---

fix: `no-improper-type-validation` credits `instanceof` as a null guard

`typeof v === 'object' && v instanceof Option` was reported with
`unsafeTypeofCheck` — "typeof x === 'object' also matches null and arrays" —
but the conjunction excludes both hazards that message names. `OrdinaryHasInstance`
returns `false` for every value that is not an Object, so `null instanceof Option`
is `false` (it does not throw; only a non-callable _right_ operand throws) and
`[] instanceof Option` is `false`.

`hasNullGuard` accepted `!==`/`!=` against a nullish literal and a bare
truthiness test, but not `instanceof`, even though the rule's own comment
credits bare truthiness for being "strictly stronger than `x !== null`" — which
`instanceof` also is. Adding a provably redundant `v !== null` to the identical
condition already silenced the rule, so the verdict was turning on the spelling
of a no-op clause.

The cross-realm `instanceof` hazard is a separate messageId
(`unsafeInstanceofUsage`, gated on `allowInstanceofSameRealm`) and is unchanged.
