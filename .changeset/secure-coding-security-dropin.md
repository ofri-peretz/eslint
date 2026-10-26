---
'eslint-plugin-secure-coding': minor
---

feat(secure-coding): `no-invisible-characters` and `no-disabled-template-escaping`

Two new rules, both covering checks `eslint-plugin-security` makes and this plugin
did not. Neither is in `recommended`; enable them by name or through `strict`.

`no-invisible-characters` (CWE-1007) reports the Hangul fillers U+3164 and
U+FFA0, plus the same class: U+115F, U+1160, U+17B4 and U+17B5. These are letters
that render as nothing, so they can hide anywhere in source: in an identifier
(`admin` and a lookalike `admin` become two variables), in a string, in a comment,
or alone as a whole identifier. `no-bidi-characters` and `no-homoglyph-identifiers`
do not report them, and this rule does not report the characters those rules
cover, so no character gets two findings. Each finding offers a suggestion that
removes the character. It covers `detect-invisible-characters`, and all of that
rule's test cases are ported into this one's suite.

`no-disabled-template-escaping` (CWE-79) reports `x.escapeMarkup = false`, which
turns off a template engine's HTML auto-escaping for every template at once. It
also matches `x['escapeMarkup'] = false` and ``x[`escapeMarkup`] = false``, which
`detect-disable-mustache-escape` misses. A variable key (`x[name] = false`) does
not report.
