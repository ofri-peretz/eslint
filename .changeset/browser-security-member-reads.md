---
'eslint-plugin-browser-security': patch
---

fix: three rules read a subscripted member the same as its dotted twin

- `no-innerhtml` resolved a sink callee on `property.name`, so
  `window['document']['write'](payload)` reached the same sink unreported.
- `require-blob-url-revocation` keyed paths on the dotted spelling only, so a
  URL created as `preview['src']` was never matched against the revoke written
  as `preview.src` — the two halves of the same lifecycle stopped seeing
  each other.
- `require-csp-headers` took the last receiver segment only when it was not
  computed, so `ctx['res'].render(v)` read as a template engine returning a
  string rather than a response, and the missing header went unreported.

Each keeps abstaining on a key chosen at runtime, pinned by its own case.
