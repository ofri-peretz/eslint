---
'eslint-plugin-browser-security': patch
'eslint-plugin-secure-coding': patch
---

fix: two more false positives, found by rescanning after the last batch shipped.

`require-csp-headers` matched the method name `render` on any receiver.
`nunjucksEnv.render(template, data)` returns a string; only `res.render(view)`
emits a response. On ministryofjustice/hmpps-arns-assessment-platform-ui that
was 31 reports — every Nunjucks component module and every component test — in
a repository that already sets a nonce-based CSP in middleware. Gated on the
receiver, and the rule now takes `skipTestFiles`, which covered 29 of the 31.
Down to 3.

`no-missing-authentication` treated `app.get('port')` as a route. Express
overloads the name: one argument reads a setting, two or more registers a
route. `app.listen(app.get('port'), …)` was reported as an unauthenticated
endpoint. A route always has a handler after its path, so the arity test is
exact — and the `app.route(path).get(handler)` chained form, where the path
comes from the previous call, keeps reporting.
