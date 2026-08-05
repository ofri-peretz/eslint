---
'eslint-plugin-node-security': minor
---

`detect-non-literal-fs-filename` now resolves the fs binding instead of matching
one spelling of it.

The gate required the receiver be literally the identifier `fs`, so a named
import from `node:fs/promises`, a renamed default import, a namespace import,
`fs.promises.*` and a destructured `require` were all silently unchecked — the
rule's own documentation used `const { readFile } = require('fs')` as its first
incorrect example, a shape it never reported. All of those are now checked, and
bindings are resolved across the whole file before any call is judged, so a
`require` below its call site counts too.

Detection is strictly wider, so expect more findings. Because of that,
`detect-non-literal-fs-filename` drops from `error` to `warn` in the
`recommended` preset: measured on the ecosystem repo the widened rule reports
854 findings (555 outside test files), and it has no notion of a trust
boundary — a build script reading its own repo reports identically to a request
handler reading user input. Set it back to `error` explicitly if you want the
old severity; it will be reconsidered once the corpus run measures its
false-positive profile.
