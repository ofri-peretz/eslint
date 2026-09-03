---
'eslint-plugin-postgresql-security': patch
---

`no-missing-client-release` and `prefer-pool-query` now expose their CWE at
`meta.docs.cwe`, so every formatter renders it.

Both rules already asserted a CWE — CWE-404 and CWE-400 respectively — but only
inside `formatLLMMessage`, which the formatter cannot read. The effect was that
an LLM consumer saw the security classification and every other render saw
none. No rule logic changes; this is metadata that was present and unreachable.
