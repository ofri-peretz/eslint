---
'@interlace/eslint-devkit': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-express-security': patch
---

Test-file detection now recognises compound directory names.

The shared predicate matched exact segments — `test`, `tests`, `spec`, `e2e` —
and missed the compound names large repositories actually use.
sentry-javascript keeps its entire suite under `dev-packages/e2e-tests/`,
`dev-packages/node-integration-tests/` and
`dev-packages/browser-integration-tests/`, none of which matched.

A directory segment ending in `-test`, `-tests`, `-spec` or `-specs` is now
treated as test material. The hyphen is required, so `latest` and `manifest`
stay production code.

`require-https-only` and `no-exposed-debug-endpoints` additionally opt out of
test files entirely. Both judge runtime posture — where bytes go, and what a
server is configured to expose — and a test application's posture never ships.
Rules that already expose their own `allowInTests` option were deliberately left
alone: skipping ahead of them would override a user's explicit
`allowInTests: false`.

Measured across four large public repositories, together with the `no-http-urls`
fix in this release: 671 findings before, 164 after. sentry-javascript alone
went from 248 to 43.
