---
'eslint-plugin-node-security': patch
---

`no-timing-unsafe-compare` no longer treats a route as a credential.

`DEFAULT_NON_SECRET_TAILS` already carried `address` on the reasoning that a
trailing word can mark a value as a location rather than a secret. The rest of
that idea was missing, so this fired on Shopify/cli's OAuth callback server:

```js
if (requestUrl.pathname !== STORE_AUTH_CALLBACK_PATH) { /* 404 */ }
```

`requestUrl` derives from `req.url`, so one operand is attacker-readable and the
other is not — the taint shape the rule reports on. The name carries `auth`
because it belongs to an auth *flow*; the value is a route, and timing a route
match leaks nothing. CWE-208 at CVSS 5.9 on request routing.

Added: `path`, `paths`, `pathname`, `pathnames`, `endpoint`, `endpoints`,
`route`, `routes`, `hostname`, `host`, `port`, `origin`.

`url` and `uri` are deliberately **not** tails — a presigned URL carries its
signature in the query string and is itself the credential, so `signatureUrl`
must keep reporting. Pinned as an FN guard, alongside `STORE_AUTH_CALLBACK_TOKEN`
which proves the tail is what excludes rather than the `auth` word.

Verified on the pinned corpus: this rule drops from 1 finding to 0, total
42 → 41.
