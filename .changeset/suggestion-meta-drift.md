---
'eslint-plugin-mongodb-security': minor
'eslint-plugin-browser-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-conventions': patch
'eslint-plugin-import-next': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-react-features': patch
---

`meta.hasSuggestions` now matches what each rule actually emits.

ILB-Remediation measured 27 rules where the declaration and the implementation
disagreed: 22 declared `hasSuggestions: true` without ever passing `suggest:`
to `context.report()` (IDE quick-fix menus advertising remediation that never
arrives), and 5 emitted `suggest:` without the declaration (latent — ESLint
throws on that combination as soon as one of those suggestions carries a real
fixer).

`eslint-plugin-mongodb-security` gains four real suggestions where the rewrite
is mechanical:

- `require-lean-queries` — appends `.lean()`
- `no-unbounded-find` — appends `.limit(100)`
- `no-debug-mode-production` — rewrites the flag to `process.env.NODE_ENV !== 'production'`
- `require-tls-connection` — adds (or flips) `tls: true` in the connection options

Every other dead declaration was removed rather than faked. A workspace lock
(`scripts/__tests__/suggestions-meta-lock.test.ts`) now fails CI on either
direction of the drift.
