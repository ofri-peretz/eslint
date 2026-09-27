---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` reports writes through TypeScript type-only wrappers

`o[a][b]! = v`, `(o[a][b] as unknown) = v`, `(o[a] satisfies T) = v`, `(<any>o[a]) = v`,
`o[a]!++` and `o.__proto__[b]! = v` were classified as reads and exempted, although
TypeScript erases the wrapper and emits exactly the write the rule reports — the
two-step and `__proto__` forms pollute `Object.prototype` (verified in Node 24). Each
wrapped form now reports what its unwrapped twin reports; wrapped reads stay silent.
