---
'eslint-plugin-modularity': patch
---

fix: barrel and boundary gates read a subscripted member

The gate compared `property.name` before asking what the property was.
