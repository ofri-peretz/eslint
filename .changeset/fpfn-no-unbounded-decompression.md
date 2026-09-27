---
'eslint-plugin-node-security': patch
---

fix(node-security): `no-unbounded-decompression` resolves zlib bindings through scope

The rule now reports uncapped decompression reached through an inline
`require('node:zlib').gunzipSync(...)`, `await import('node:zlib')` (namespace or
destructured), a TypeScript `import zlib = require('zlib')`, and a decompressor
destructured from a zlib namespace import. It no longer reports a function
parameter that shadows an imported `gunzipSync`.
