---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` no longer throws under oxlint on an untyped `forEach` receiver

`export function f(bag, dst) { bag.forEach((v, k) => { dst[k] = v; }); }` threw
`TypeError: Cannot read properties of null (reading 'typeAnnotation')` under oxlint's
JS-plugin host. oxc's AST sets an absent parameter annotation to `null` where
typescript-estree leaves it `undefined`, and the Array-provenance check tested only for
`undefined`. oxlint aborts the file when a JS rule throws, so this rule's finding and
every other plugin's finding on the file were lost. It now reports under oxlint exactly
as it does under ESLint.
