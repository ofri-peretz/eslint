---
'eslint-plugin-node-security': patch
---

Found linting open-source Node apps.

- `no-timing-unsafe-compare`: a value the server holds compared with another
  value the server holds (`req.session.csrfSecret` against its own memo, a row
  of `req.user.sessions` against the current session id) is no longer reported.
  New detection: a configured secret (`process.env.*SECRET*`/`*KEY*`/`*TOKEN*`,
  or a secret property of an imported `config`) compared with a parameter or a
  constructor-supplied field is reported without a request in sight. Two secret
  names alone stay silent, as before.
- `detect-eval-with-expression`: `new Function('s', 'return import(s)')` is skipped.
