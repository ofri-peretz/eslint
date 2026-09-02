---
'eslint-plugin-secure-coding': patch
---

fix: `no-hardcoded-credentials` stops reporting error codes and module paths

Two CVSS 9.8 findings against the pinned corpus, neither a secret:

- `MTLS_INCOMPATIBLE_CLIENT_AUTH: 'mtls_incompatible_client_auth'` in
  auth0/express-openid-connect. The key ends in `auth`, which opens the
  credential-context gate, and the value then clears the two-character-class
  test on its underscores. A secret is never its own key's name — whoever
  generated it did not consult the variable it would be stored in — so a value
  that folds to its own slot name is now read as the error code it is.

- `const OktaAuth = '<rootDir>/build/cjs/exports/default.js'` in
  okta/okta-auth-js, a jest `moduleNameMapper` target. A `<token>` root is a
  path root; the path check now strips it rather than failing on the missing
  leading slash.

Both discriminators are structural relations, not new word vocabulary. A value
that merely resembles its key is still judged on its shape.
