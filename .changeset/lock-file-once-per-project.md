---
'eslint-plugin-node-security': patch
---

lock-file: report once per project, not once per file

The rule carried `let checked = false` inside `create()`, which reads as a
once-only guard but is not one — ESLint calls `create()` per file, so the flag
reset every time. Linting auth0/express-openid-connect produced 135 identical
findings, at arbitrary lines such as `end-to-end/fixture/jwk.js:34`, for a
single fact about the repository.

The report is now keyed on the nearest `package.json`, at module scope so it
survives across files. A directory with no manifest anywhere above it is not a
JS project and is no longer reported at all.
