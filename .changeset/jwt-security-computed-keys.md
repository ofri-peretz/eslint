---
'eslint-plugin-jwt-security': minor
---

Every JWT rule now sees `jwt['sign']` as the same call as `jwt.sign`

`isJwtLibraryCall` is the single place every rule in this plugin decides whether
a call is a JWT operation, and it required the callee's property to be an
Identifier. So `jwt['sign']({ password }, secret)` was not a sign,
`jwt['verify'](...)` was not a verify, and `jwt['decode'](...)` was not a decode.

One gate, seven rules reading it, thirteen showing measurably blind cases.

A dynamic `jwt[m](...)` still names no method and is still ignored.
