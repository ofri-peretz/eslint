---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

refactor(secure-coding): `no-redos-vulnerable-regex` parses patterns with its own parser instead of `@eslint-community/regexpp`

`eslint-plugin-secure-coding` now has a single runtime dependency, `@interlace/eslint-devkit`. The pattern parser the rule used is vendored into `src/regex-parser/`, trimmed to the one path it takes (a pattern string under `u`, `v` or neither, at the newest ECMAScript edition), with the MIT notice in `THIRD_PARTY_NOTICES.md`. A pattern it cannot parse is skipped, as before. Parse results and error messages are identical to `regexpp`'s over 33,000 real-world and 450,000 generated pattern/flag combinations.
