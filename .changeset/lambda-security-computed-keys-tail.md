---
'eslint-plugin-lambda-security': patch
---

fix: `client['send'](cmd)` is the same external call as `client.send`

`require-timeout-handling` read the call name off `property.name`, so a
subscripted AWS SDK send did not register as an external call.
