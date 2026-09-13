---
'eslint-plugin-operability': patch
---

fix: `no-debug-code-in-production` no longer reports `DEBUG` in property positions

The `Identifier` visitor fired on every token named `DEBUG` or `__DEV__`,
including object-literal keys and non-computed member property names. A severity
table such as `{ WARN: 1, INFO: 2, DEBUG: 3 }` was reported as CWE-489 "Active
Debug Code" at HIGH, for both the key and every `LEVEL.DEBUG` read — neither of
which is a reference, and neither of which has a compliant rewrite, since the
table has to ship for the file to compile.

Only reference positions report now. Computed forms (`o[DEBUG]`, `{ [DEBUG]: 1 }`)
genuinely read the binding and are unaffected.
