---
'eslint-plugin-mongodb-security': patch
---

fix: remaining Mongo gates resolve a subscripted method

A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
compared `property.name` before asking what the property was. They now resolve
through the devkit's `propertyName`, which still abstains on the one shape that
genuinely cannot be resolved: a key chosen at runtime, whose name is not
statically known.
