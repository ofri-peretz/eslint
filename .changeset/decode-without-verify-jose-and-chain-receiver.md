---
'eslint-plugin-jwt-security': patch
---

`no-decode-without-verify`: detect jose's `decodeJwt`, and apply the
foreign-import gate to chained receivers.

The reported false positive ("matches any method named `decode`") no longer
reproduces — the SDK-evidence gate landed since the report. Measured over the
8-repo corpus, the rule produces **1 finding**, and it is a true positive
(`twilio/twilio-node` `src/auth_strategy/TokenAuthStrategy.ts:49`, a genuine
`jsonwebtoken` decode). Both cited shapes are now locked as `valid` fixtures:

- `file.content = file.decode(raw)` — Shopify/cli's TOML parser, no JWT
  library imported in the file.
- `sdk.token.decode(accessToken)` — okta/okta-auth-js
  `lib/oidc/handleOAuthResponse.ts:109`; that file imports only relative paths.

Verifying those locks surfaced two real defects, both fixed here:

- **jose's decode went unreported.** The method set listed `decodeJWT`, an
  all-caps spelling no JWT library ships. jose's actual export is `decodeJwt`
  (`Object.keys(require('jose')).filter(k => /decode/i.test(k))` →
  `['decodeJwt', 'decodeProtectedHeader']`), so every `decodeJwt(token)` call
  was a false negative despite jose being a listed library.
  `decodeProtectedHeader` is deliberately not added: reading the header to pick
  a key before verifying is the documented jose flow, and `allowHeaderInspection`
  already covers it.

- **The foreign-import gate skipped chained receivers.** It read
  `callee.object` and required an `Identifier`, so `sdk.token.decode(t)` — whose
  receiver is itself a MemberExpression — was never checked against the file's
  imports at all. It now walks to the root of the chain. This is the same shape
  the gate was built for (`argon.verify(...)` in a file that also imports
  `jsonwebtoken`), one member deeper.
