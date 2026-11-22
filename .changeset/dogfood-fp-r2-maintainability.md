---
'eslint-plugin-maintainability': patch
---

fix: stop reporting re-thrown errors and the classic module wrapper

`no-missing-error-context` accepts `throw res.error` / `throw this.reason`. `no-unreadable-iife` accepts the classic `(function () { ...; module.exports = x; }());` module wrapper.
