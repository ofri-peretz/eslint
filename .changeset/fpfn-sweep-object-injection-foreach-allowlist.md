---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` accepted a `const` allowlist only in `for-of`, not in `.forEach`

The allowlist exemption proves safety from a property of the ARRAY — every value the key can take is spelled out in the file — but it was reachable only through the `for-of` spelling. The identical allowlist iterated with `.forEach` still reported, so semantically equivalent code was treated differently by iteration syntax alone. The exemption now also recognises a callback parameter bound to an element of a resolvable `const` array literal. The guards stay: a `let` binding, a list containing `__proto__`, a sparse hole, a parameter or call-sourced list, a `concat` receiver, a member-chain receiver and `reduce`'s accumulator slot all continue to report. The exemption binds the callback's first parameter only; the index parameter is not an allowlist element (it is cleared separately, as a Number, by the Array-index exemption).
