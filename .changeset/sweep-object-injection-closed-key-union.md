---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): detect-object-injection false positive on a const dispatch table indexed by its own key-union type

`obj[key]` where `obj` is a `const` object literal with a closed set of
literal keys, and `key`'s own declared TS type — stated directly or through
a type alias in the same file — is a union of string literals that is a
subset of that key set, no longer reports. `__proto__` and `constructor`
are excluded by the key's own type, so no runtime guard is needed to prove
the access cannot reach the prototype.
