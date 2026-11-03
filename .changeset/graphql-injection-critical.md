---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `no-graphql-injection` labels an injection CRITICAL, as its CVSS 9.8 and its docs already say

The message rendered CVSS 9.8 and called it HIGH.
