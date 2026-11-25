---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

refactor(secure-coding): `no-redos-vulnerable-regex` runs its own backtracking analysis instead of `refa` and `scslre`

The two packages are gone from the dependency list. What the rule used of them (set algebra over characters, the Unicode property and case-folding data, and `scslre`'s ambiguity detection) now lives in `src/rules/no-redos-vulnerable-regex/analysis/`, trimmed to what the rule calls, with the MIT notices shipped in `THIRD_PARTY_NOTICES.md`. Verdicts are unchanged: the same 400-odd recorded `scslre` answers, 65,000 real-world patterns and 150,000 generated ones agree report for report. `@eslint-community/regexpp` is still used for parsing.
