---
'eslint-plugin-secure-coding': patch
---

fix: no-insecure-comparison skips a secret against its own transform and a guarded store re-read

`secret.trim() !== secret` (nestjs/webhooks) compares one secret with itself, so there is nothing to time. A member call on the other operand with literal arguments only is skipped. Separately, `if (!record) return false` between two reads of the same store (nestjs/authentication MFA) counted as the record escaping; a `!`, `typeof` or comparison only tests it. `fallback || record` still counts as an escape.
