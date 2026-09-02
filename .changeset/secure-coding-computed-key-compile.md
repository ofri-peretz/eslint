---
'eslint-plugin-secure-coding': patch
---

fix: `ng['$compile'](tpl)` compiles the same directive template

`no-directive-injection` named its compile method off `property.name`, so the
subscripted spelling of `$compile`, `$interpolate`, `compile` and `template`
reached nothing.
