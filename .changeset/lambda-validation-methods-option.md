---
'@interlace/eslint-plugin-lambda-security': minor
---

`no-unvalidated-event-body` takes `validationMethodNames`

The rule treated `parse`, `validate`, `assert` and `is` as proof that a value
had been checked. Those are generic English, not a schema library's API —
`parse` alone is `JSON.parse`, `Date.parse` and a CSV reader. A project on
`ajv.compile(schema)(x)` or a hand-written `check()` matched none of them, so
every handler it validated was still reported. `validationMethodNames` replaces
the list.

The event properties it reads are cited rather than made configurable: they are
the API Gateway proxy integration's payload fields, and those names are AWS's.
