---
'eslint-plugin-browser-security': patch
---

fix: `r['route']('/x').post(h)` is the same unprotected route chain

`no-missing-csrf-protection` gated the verb, the `.route(…)` root and the
`app.use(csrf())` mount on `property.name`, so a fully subscripted router
chain registered a POST with no CSRF middleware and reported nothing.
