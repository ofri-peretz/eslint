---
'eslint-plugin-secure-coding': minor
---

feat(secure-coding): no-disabled-template-escaping covers swig, nunjucks and Handlebars

The rule only knew `escapeMarkup = false`. It now also reports `swig.setDefaults({ autoescape:
false })`, `new swig.Swig({ autoescape: false })`, `nunjucks.configure(path, { autoescape: false })`,
`new nunjucks.Environment(loader, { autoescape: false })`, `env.opts.autoescape = false` and
Handlebars `compile` / `precompile` with `{ noEscape: true }`. An options object declared once as a
`const` and then passed to one of those calls is followed.

The option name alone does not name an engine, so the object has to reach one of those calls:
`render(page, { autoescape: false })` stays quiet. EJS `<%-` and Pug `!=` live inside template
files that ESLint never parses and are not reachable from a JavaScript rule.
