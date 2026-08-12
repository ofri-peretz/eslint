---
'eslint-plugin-browser-security': patch
---

`no-http-urls` and `detect-mixed-content` no longer report XML namespace URIs
or loopback origins.

```jsx
<svg xmlns="http://www.w3.org/2000/svg" />   // was reported by BOTH rules
const base = 'http://localhost:3000';         // was reported as mixed content
```

**Namespace URIs are identifiers, not requests.** `http://www.w3.org/2000/svg`
is compared byte-for-byte by the XML parser and never dereferenced, so it
carries no transport risk — and "fixing" it to `https://` **breaks the
document**, because the string no longer matches the namespace. That makes this
worse than noise: the advice was actively harmful.

It was also the single largest false-positive shape in the corpus — 29
occurrences in `okta/okta-signin-widget` alone, reported by *both* rules, so 58
findings from one misunderstanding. Recognised two ways, either sufficient: a
registered namespace-authority host, or an `xmlns` / `xmlns:*` attribute or
property name whatever the host.

**Loopback is a secure context.** Per the Secure Contexts spec a loopback
origin is *potentially trustworthy*, so no browser blocks or flags
`http://localhost:3000` from an HTTPS page. Calling it mixed content described
behaviour that does not happen; every corpus hit was webpack dev-server or
end-to-end fixture config. `no-http-urls` already had `allowedHosts` defaulting
to localhost — `detect-mixed-content` had no options at all and now shares the
same understanding.

Measured on the 8-repo corpus:

| Rule | Before | After |
|---|--:|--:|
| `no-http-urls` | 45 | **8** |
| `detect-mixed-content` | 49 | **2** |

The allowlist is by **host**, not substring: `http://cdn.example.com/w3.org/x.js`
is still a real request and still reports, as does `http://localhost.evil.com`.
