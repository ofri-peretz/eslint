---
'eslint-plugin-secure-coding': patch
---

test: no-hardcoded-credentials locks that a migration-shaped name in a secret slot still reports

Adds a boundary case (`const secret = 'AddMfaColumnsToUsers1784073600000'` reports) and documents the leading-zero floor in `isTimestampedName`. No behaviour change.
