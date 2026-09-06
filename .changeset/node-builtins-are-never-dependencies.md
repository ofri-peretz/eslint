---
'eslint-plugin-import-next': patch
---

fix(no-extraneous-dependencies): `node:` builtins are never dependencies

`import process from 'node:process'` was reported as a missing dependency.
The rule skipped builtins from a hand-written list of 29 names frozen at
roughly Node 8 — no `process`, `module`, `worker_threads`, `perf_hooks`,
`async_hooks` or `test` — so the spelling `unicorn/prefer-node-protocol`
demands was the one this rule rejected.

A `node:`-prefixed specifier is a builtin by definition and is now skipped
outright; the bare names come from `builtinModules` in `node:module`, so the
list is whatever the running Node says it is rather than one that rots.
