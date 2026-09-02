---
'eslint-plugin-operability': patch
---

fix: `res['send'](err.stack)` leaks the same stack as `res.send`

The Express response gate compared `property.name` before asking what the
property was.
