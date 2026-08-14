---
'eslint-plugin-secure-coding': minor
'eslint-plugin-browser-security': minor
'eslint-plugin-node-security': minor
---

100% drop-in parity with `eslint-plugin-security`, and twelve false-positive fixes.

Parity against the incumbent's own RuleTester suite reaches 51/51 live cases.
`detect-non-literal-fs-filename` now reports a path composed from an unresolvable name
such as a template interpolation or a `path.resolve` argument, while `__dirname`-rooted
constant paths stay silent.

False positives removed, each found by hand-reading findings on 20 open-source projects and
each locked with a test that fails on the unfixed rule:

- `no-missing-authentication` no longer treats path-less `app.use(helmet())` as a route
  handler, and ships a default public-route allowlist so login, password-reset and health
  endpoints are not reported. It also no longer writes `console.log('DEBUG MSG:')` to stdout,
  which corrupted the JSON and SARIF formatters for anyone using `ignorePatterns`.
- `detect-object-injection` no longer reports a computed read off a `const` object literal —
  the closed allowlist is the documented fix for this CWE.
- `no-http-urls`, `no-insecure-websocket` and `no-unencrypted-transmission` exempt loopback
  and RFC 2606 reserved domains through one shared helper. `mongodb://user:pass@localhost`
  still reports.
- `no-insecure-comparison` no longer treats a comparison against a boolean, `null` or
  `undefined` literal as a timing attack.
- `no-format-string-injection` requires an actual format specifier and no longer double-reports.
  It also gains a fix: `console.log(userText, secret)` is now detected, because Node runs the
  first argument through `util.format` whenever more arguments follow.
- `no-directive-injection` recognises a sanitizer call as the fix rather than the defect.
- `require-csp-headers` recognises helmet; `no-missing-security-headers` no longer fires on a
  scope that only sets transport or caching headers.
- `no-graphql-injection` requires a selection set to name a field.
- `no-unsafe-regex-construction` no longer reports a RegExp clone.

`browser-security/no-clickjacking` is deprecated and has been removed from `recommended`. It
remains exported; enable it explicitly if you still want it.

Every rule now ships a documentation page (121/121).
