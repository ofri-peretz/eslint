---
'eslint-plugin-jwt-security': patch
---

fix: `decoded['exp']` is the same time claim as `decoded.exp`

A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
compared `property.name` before asking what the property was. They now resolve
through the devkit's `propertyName`, which still abstains on the one shape that
genuinely names nothing: a key chosen at runtime.
