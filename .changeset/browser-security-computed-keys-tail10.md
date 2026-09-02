---
'eslint-plugin-browser-security': patch
---

fix: the CORS checks read subscripted calls and quoted option keys

`app['use'](cors({…}))` and `{ ['origin']: '*' }` are the same middleware and
the same option. Three source-text patterns were dotted-only and are now
named constants accepting either spelling; the `origin` key resolves through
`objectKeyName` in all three places it is read.
