---
'eslint-plugin-secure-coding': patch
---

fix: `Math['random']()` is recognised as the same weak token source

`no-weak-password-recovery` detects predictable generators by matching SOURCE
TEXT, and every pattern was written dotted-only — `/\bMath\s*\.\s*random\s*\(/`.
A reset token built from `Math['random']()` is exactly as guessable, and the
regex never saw it. The patterns now accept either spelling and still reject a
runtime key such as `Math[pick]()`.
