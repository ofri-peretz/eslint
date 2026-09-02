---
'eslint-plugin-express-security': patch
---

fix: `app['post']('/auth/token', h)` registers the same unlimited route

`require-rate-limiting` lowercased `property.name` to find the HTTP verb, so a
subscripted registration was never checked for a limiter.
