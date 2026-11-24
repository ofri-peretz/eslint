---
'eslint-plugin-secure-coding': patch
---

fix: no-hardcoded-credentials no longer reports migration class names as secret keys

A name made of words plus an epoch timestamp, such as `AddMfaColumnsToUsers1784073600000`, passed every random-key shape test and was reported at CVSS 9.8.
