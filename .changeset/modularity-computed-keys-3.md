---
'eslint-plugin-modularity': patch
---

fix: `app['get']('/user', h)` is the same route as `app.get`

The route gate and the status-code gate compared `property.name` first, so a
subscripted registration went unchecked. A test had pinned it as valid on the
grounds that "property is not an Identifier"; Express registers it
identically.
