---
'eslint-plugin-secure-coding': patch
---

Found linting open-source Node apps: fewer false positives in
`no-hardcoded-credentials` (i18n keys, single foreign words, type tags, masked
values, `tests.js` modules), `no-xpath-injection` (own `evaluate` method, log
prefixes, usage strings), `no-sensitive-data-exposure` (a fact about a secret),
`no-weak-password-recovery` (React components, log prose) and
`no-privilege-escalation` (a role comparison guarding the write).
