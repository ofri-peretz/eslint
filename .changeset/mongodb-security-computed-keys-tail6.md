---
'eslint-plugin-mongodb-security': patch
---

fix: `mongoose['connect'](uri)` opens the same unauthenticated connection

`require-auth-mechanism` resolved the connect method off `property.name`, so
the subscripted spelling skipped the authMechanism check.
