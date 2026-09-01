---
'eslint-plugin-browser-security': patch
---

fix: analytics and Express route detection now read a string-subscript method

`analytics['track'](…)` reaches the same vendor `analytics.track(…)` does, and
`app['post']('/x', h)` registers the same unprotected route as `app.post`. Both
shared utilities compared `property.name` before asking what the property was,
so four rules — `no-tracking-without-consent`,
`no-sensitive-data-in-analytics`, `no-missing-csrf-protection` and
`no-missing-cors-check` — went silent on the notation minifiers emit.

Two tests had pinned the miss as intended behaviour ("a computed method is not
a route registration"); neither gave a reason a bracket should change the
destination. Both now assert the report, with the genuinely unknowable case —
a method chosen at runtime, `app[verb](…)` — pinned separately as the refusal
it should be.
