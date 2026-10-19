---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): wrong verdicts surfaced by Stryker mutation testing (batch 1)

- `no-template-injection` now follows a request template through `??`, `||`, the right side of `&&`, and either branch of a conditional: `Handlebars.compile(req.query.tpl ?? DEFAULT)`, `ejs.render(useDefault ? DEFAULT : req.body.tpl, data)` and the like are reported. The left side of `&&` is not: it reaches the engine only as a falsy, empty template.
- `no-log-injection` no longer reports a local that is reassigned after its request initializer, as in `let name = req.query.name; name = name.replace(/[\r\n]/g, ''); logger.info('user ' + name)`. The rule already treated a sanitising call as breaking attribution, and a later write breaks it the same way.
