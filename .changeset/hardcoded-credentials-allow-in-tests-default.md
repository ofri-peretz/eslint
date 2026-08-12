---
'eslint-plugin-secure-coding': minor
---

`no-hardcoded-credentials`: `allowInTests` now defaults to `true`.

The issue asked which of two things was broken — the option not being read, or
its filename patterns not matching `integration/*.test.js`. Measured: neither.
The option is read, and `filename.includes('.test.')` matches that path. It
simply defaulted to `false`, and `configs.recommended` registers this rule as
bare `'error'` with no options, so the exemption was never switched on for
anyone using the recommended preset.

The effect on a real repository was 17 of 18 findings being fixtures in
`integration/auth.test.js` — roughly 94% noise in the default configuration of
any project with tests.

A credential in a test fixture is not an exploitable finding for this rule.
Committed real secrets are a secret-scanning problem — gitleaks and trufflehog
scan history and drive key rotation, neither of which a linter can do.

Production paths are unchanged: `const password = "supersecret123"` in
`src/app.js` still reports. Set `allowInTests: false` for the previous
behaviour.
