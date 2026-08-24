---
'eslint-plugin-conventions': patch
'eslint-plugin-express-security': patch
---

docs: eight published rules finally have documentation

`analytics-event-naming`, `no-magic-numbers`, `no-raw-cross-property-href` and
`utm-taxonomy` (conventions), plus `no-user-controlled-redirect` and deprecation
notices for `no-missing-cors-check` / `no-missing-csrf-protection` /
`no-missing-security-headers` (express-security) had implementations, README
rows and exported ids — but no rule docs. Examples are lifted from each rule's
own test fixtures. README rules tables regenerated.
