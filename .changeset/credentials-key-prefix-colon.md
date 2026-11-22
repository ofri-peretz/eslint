---
'eslint-plugin-secure-coding': patch
---

fix: `no-hardcoded-credentials` no longer reports a word identifier with one trailing colon, a key or clipboard prefix such as `'huly-table-metadata:'` under a `TOKEN`-named constant (an adopter had to disable it). A colon between a label and a payload (`user:Zk9f...`, `admin:...`), and a dense value that merely ends in a colon, still report.
