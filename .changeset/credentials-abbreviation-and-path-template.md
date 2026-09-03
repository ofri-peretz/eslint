---
'eslint-plugin-secure-coding': patch
---

`no-hardcoded-credentials` stops reporting error codes and build-tool paths

Two false positives at CWE-798 / CVSS 9.8 / CRITICAL, tagged SOC2 PCI-DSS
HIPAA GDPR, both in authentication libraries and both found the first hour the
corpus scan could see again:

- `auth0/express-openid-connect` — `MTLS_INCOMPATIBLE_CLIENT_AUTH:
'mtls_incompatible_client_auth'`, an error code. Every token but `mtls` is a
  dictionary word, and the vowel requirement in `isNaturalWordString` made that
  one abbreviation opaque the whole string. `jwt`, `xhr`, `sql` and `ssh` did
  the same.
- `okta/okta-auth-js` — `const OktaAuth = '<rootDir>/build/cjs/exports/default.js'`,
  a Jest module map entry. `isUrlOrPath` accepts a scheme or a leading `/`, and
  a templated root is neither, so the value never reached the path guard.

Detection is unchanged for real credentials. The abbreviation allowance applies
only to values carrying no digits — a key shape keeps the vowel requirement,
verified against real Stripe, GitHub, Google and Slack key formats — and only
the templated ROOT is stripped, so an opaque segment after one is still
reported.
