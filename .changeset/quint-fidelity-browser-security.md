---
'eslint-plugin-browser-security': patch
---

fix(browser-security): rules match their documented contracts

Checked against a Quint model of each rule's documented contract (`npm run fidelity`) and by Stryker mutation testing. Among the fixes:

- `require-postmessage-origin-check` accepts an exact-match allowlist and checks `window.onmessage` handlers.
- `no-unvalidated-deeplinks` honours validation.
- `require-csp-headers` requires helmet to be applied with CSP enabled.
- `no-credentials-in-query-params` matches `access_token` / `client_secret` / `api_key`.
- `no-insecure-redirects` sees through `!` / `as`.

Docs that described a wider contract than a deliberately narrowed rule are rewritten. The deprecated rules' docs now name their replacements.
