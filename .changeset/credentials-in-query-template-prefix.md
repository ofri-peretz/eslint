---
'eslint-plugin-browser-security': patch
---

`no-credentials-in-query-params` no longer reports templates that merely contain
the text `token=`.

```js
outputDebug(`Loaded session for ${store}: token=${maskToken(session.accessToken)}`);
```

That is a debug log, not a URL, and the value is explicitly **masked** — wrong
on both counts. Two causes:

- The `TemplateLiteral` branch read `sourceCode.getText(node)`, which returns
  the template's own **source**, interpolations included. The characters of
  `${maskToken(session.accessToken)}` were part of the text being matched. The
  repo's standing rule is to match the AST, never printed source.
- It required no `?` or `&` prefix, while the `Literal` branch did. That
  asymmetry was the bug: a literal needed `?token=`, a template matched a bare
  `token=` anywhere — including the `: token=` of a log line.

Both branches now use the same test, over the static quasi text only, with each
interpolation replaced by a placeholder so `?` and `token=` cannot be joined
across a boundary.

Measured on the 8-repo corpus: **11 findings → 1**, and that one is a genuine
true positive (`okta/okta-signin-widget` `RouterUtil.js:34` puts a real token in
a query string).

`?stateToken=` is no longer matched by `?token=` — a longer parameter that ends
in a sensitive name is a different parameter.
