---
'eslint-plugin-browser-security': patch
---

`no-http-urls` no longer reports test material or bare scheme strings.

Measured across four large public repositories (GoogleChrome/lighthouse,
getsentry/sentry-javascript, adobe/helix-cli, sveltejs/kit) this rule drew 328
of the 665 findings between them, and 295 of its 328 were inside test suites,
smoke-test definitions and integration fixtures. A smoke test named
`redirects-http` cannot be written without an `http://` URL, and a
mixed-content fixture exists precisely to hold one, so the rule now sets
`skipTestFiles`.

It also stops reporting a bare scheme with no authority. `['http://',
'https://', 'data:']` is a table for classifying URLs rather than a URL, and
the diagnostic it produced — `Hardcoded HTTP URL detected: "http://"` — named
no host and suggested no fix.

Total on those four repositories: 671 findings before, 369 after.
