---
'eslint-plugin-browser-security': patch
---

Found linting open-source Node apps: `require-postmessage-origin-check` skips
`navigator.serviceWorker` message listeners, and `no-client-side-auth-logic`
skips a confirm-password comparison of two fields of one object.
