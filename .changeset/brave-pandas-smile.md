---
'eslint-plugin-import-next': patch
---

fix: `no-nodejs-modules` — resolve builtins via `builtinModules`, and recognise subpaths.

fix: `no-nodejs-modules` — resolve builtins through `builtinModules` and recognise
subpaths. The set was a hand-written 31 of the 72 names in Node 24, with an
exact-match lookup and no subpath step, so `node:fs/promises` stayed silent
beside a reported `node:fs`, and `worker_threads` and `diagnostics_channel` were
missed outright. Two sibling rules in this package already resolve builtins this
way. `allow` now matches every spelling of one builtin, so `allow: ['fs']`
covers `node:fs/promises`.
