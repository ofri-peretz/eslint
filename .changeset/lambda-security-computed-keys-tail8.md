---
'eslint-plugin-lambda-security': patch
---

fix: `client['post'](url)` issues the same user-controlled request

`no-user-controlled-requests` matched the chained HTTP method on
`property.name`, so a subscripted call on an axios instance passed an
event-derived URL unreported.
