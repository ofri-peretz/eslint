---
'eslint-plugin-express-security': patch
---

fix: static, trust-proxy and CSRF route gates read a subscripted member

`express['static']('.')` serves the same directory, `app['set']('trust proxy',
true)` trusts every hop, and `router['post']('/x', h)` registers the same
unprotected route.
