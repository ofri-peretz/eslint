---
"@interlace/eslint-devkit": patch
---

Fix `patternToRegex` (glob→regex) to escape **all** regex metacharacters, not just `.`. The previous chained `.replace()` left `\ + ( ) | [ ] { } ^ $` to leak through as regex syntax, so an ignore glob such as `a+b` or `(x)` compiled to a quantifier / capture group and matched the wrong files (CWE-116, surfaced by CodeQL `js/incomplete-sanitization`). The wildcard translation (`**`, `*`, `?`) is unchanged; a regression-lock test pins the metacharacter behavior.
