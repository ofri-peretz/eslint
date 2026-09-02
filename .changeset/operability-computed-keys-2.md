---
'eslint-plugin-operability': patch
---

fix: `process['exit']()` is the same call as `process.exit()`

Gates compared `property.name` before asking what the property was, so the
subscripted spelling — what a minifier emits — did not reach them.
