---
'eslint-plugin-lambda-security': patch
---

fix: `error['stack']` exposes the same trace as `error.stack`

`no-exposed-error-details` matched sensitive error fields on `property.name`,
so the subscripted spelling returned a stack trace to the caller unreported.
A coverage test had pinned it as a "documented FN".
