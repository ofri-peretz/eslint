---
'eslint-plugin-secure-coding': patch
---

fix: `console['log'](user.email)` logs the same PII as `console.log`

`no-pii-in-logs` compared `property.name` to its console-method list, so the
subscripted spelling wrote PII to the same stream unreported. A method chosen
at runtime still names no sink and is still skipped.
