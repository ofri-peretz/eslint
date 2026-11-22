---
'eslint-plugin-browser-security': patch
---

fix: allow Google's documented tokeninfo GET in query-credential rule

`no-credentials-in-query-params` no longer reports `?id_token=` / `?access_token=` on `oauth2.googleapis.com/tokeninfo`, which is a GET with no body form.
