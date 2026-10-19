---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): wrong verdicts surfaced by Stryker mutation testing (batch 1)

- `no-template-injection` now follows a request template through `??`, `||`, the right side of `&&`, and either branch of a conditional: `Handlebars.compile(req.query.tpl ?? DEFAULT)`, `ejs.render(useDefault ? DEFAULT : req.body.tpl, data)` and the like are reported. The left side of `&&` is not: it reaches the engine only as a falsy, empty template.
- `no-log-injection` attributes the write that reaches the log line, not only the initializer. `let name = req.query.name; name = name.replace(/[\r\n]/g, ''); logger.info('user ' + name)` is no longer reported, because the last straight-line write is a sanitising call. A write that may or may not run (under an `if`, inside a closure, later in a loop body) does not hide an earlier one, so `let name = 'safe'; if (c) name = req.query.name;` and `name = 'safe'; name = req.query.other;` before the log line are reported.
