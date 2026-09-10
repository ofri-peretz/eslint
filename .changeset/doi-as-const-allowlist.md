---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` accepts an `as const` lookup table

`const M = ['log', 'warn'] as const; for (const m of M) console[m] = saved[m]`
reported, while the same array without `as const` was silent. The resolver read
through `Object.freeze(...)` and then required an `ArrayExpression`; `as const`
is a `TSAsExpression`, so it bailed — penalising the stronger spelling, since a
`readonly` tuple is the one TypeScript refuses to `.push` onto.

`<const>[...]`, the older spelling of the same assertion, unwraps too.

The rule's own benchmark spec already listed "a key from a frozen/`as const`
lookup table" under must-not-report; there was no fixture for it, which is how
the gap survived. Per-element checks are unchanged: a spread, a non-literal
element or a self-declared dangerous key reports exactly as before.
