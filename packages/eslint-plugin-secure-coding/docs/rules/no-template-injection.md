---
title: no-template-injection
description: Disallow dynamic strings as template arguments to server-side template engines (CWE-94)
tags: ['security', 'core']
category: security
severity: critical
cwe: CWE-94
autofix: false
---

> **Keywords:** SSTI, server-side template injection, CWE-94, code injection, Handlebars, EJS, Pug, Nunjucks, Lodash template, RCE, ESLint rule, LLM-optimized

<!-- @rule-summary -->
Disallow dynamic strings as template arguments to server-side template engines (CWE-94)
<!-- @/rule-summary -->

**CWE:** [CWE-94](https://cwe.mitre.org/data/definitions/94.html)
**OWASP:** [A03:2021 — Injection](https://owasp.org/Top10/A03_2021-Injection/)

A server-side template engine compiles its input into executable code. Passing a
user-controlled string as the **template** — rather than as the template's **data** —
hands the attacker a code path, not a text substitution. On most engines this is a direct
route to remote code execution.

The distinction is the whole rule:

```js
render(template, data)
//     ^^^^^^^^  code — must be static
//               ^^^^  data — user input belongs here
```

## Rule details

Reports when the *template* argument to a recognised engine is anything other than a
static string.

Examples of **incorrect** code:

```js
const Handlebars = require('handlebars');
app.get('/greet', (req, res) => {
  // The user controls the TEMPLATE. `{{constructor.constructor('...')()}}`
  // reaches the Function constructor from here.
  const tpl = Handlebars.compile(req.query.template);
  res.send(tpl({}));
});
```

```js
const ejs = require('ejs');
// String concatenation into a template is the same defect with extra steps.
ejs.render('<h1>Hello ' + req.body.name + '</h1>');
```

```js
const _ = require('lodash');
_.template(`<div>${userSuppliedLayout}</div>`);
```

Examples of **correct** code:

```js
const Handlebars = require('handlebars');
// The template is static; the user input is DATA.
const greet = Handlebars.compile('<h1>Hello {{name}}</h1>');
app.get('/greet', (req, res) => res.send(greet({ name: req.query.name })));
```

```js
const ejs = require('ejs');
// Rendering a file by a validated key — not by a user-supplied path.
const VIEWS = { home: 'home.ejs', about: 'about.ejs' };
const view = VIEWS[req.params.page];
if (!view) return res.status(404).end();
ejs.renderFile(view, { user: req.user });
```

## Engines covered

Handlebars, EJS, Pug/Jade, Nunjucks, Mustache, Lodash/Underscore `template`, and `dot`.
Detection is bound to the imported engine, so an unrelated local function named `compile`
or `render` reports nothing.

## Why there is no autofix

The fix is a restructure — move the dynamic part from the template argument into the data
argument — and that requires knowing which placeholder the value belongs to. A mechanical
edit cannot infer it, and a wrong guess would silently change what the page renders.

## When not to use it

Disable it for a build-time generator that compiles templates authored by trusted
developers from disk, where the template path is not reachable from a request. If a single
call site is trusted, prefer a scoped `eslint-disable-next-line` with a comment explaining
why the input cannot be attacker-controlled.

## Related

- [`no-directive-injection`](./no-directive-injection.md)
- [`no-format-string-injection`](./no-format-string-injection.md)

## ⚙️ Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `templateEngines` | `string[]` | `["Handlebars","handlebars","ejs","pug","jade","mustache","Mustache","nunjucks","swig","dust","Dust","doT","consolidate"]` | Receiver names that denote a server-side template engine, compared as an exact identifier name and never as a substring. Replaces the built-in list. |
| `additionalTemplateEngines` | `string[]` | `[]` | Extra template-engine receiver names, on top of `templateEngines` — an alias import such as `hbs` belongs here. |
| `requestRoots` | `string[]` | `["req","request","ctx","event","message"]` | Identifier roots that denote an inbound request, matched as the exact ROOT of a member chain. Replaces the built-in list. |
| `additionalRequestRoots` | `string[]` | `[]` | Extra request-object root names, on top of `requestRoots`. |
| `requestProperties` | `string[]` | `["query","params","body","headers","url","path","cookies","data"]` | Request properties that carry caller-supplied data, matched as a whole segment of the member chain. Replaces the built-in list. |
| `additionalRequestProperties` | `string[]` | `[]` | Extra request properties, on top of `requestProperties` — hapi's `request.payload` belongs here. |
| `untrustedNameWords` | `string[]` | `["user","untrusted","attacker","external","remote","client","payload","input"]` | Words with which an author states a value came from outside, compared as a WHOLE word of the split identifier and never as a substring. Replaces the built-in list. |
| `additionalUntrustedNameWords` | `string[]` | `[]` | Extra untrusted-provenance words, on top of `untrustedNameWords`. |
