---
'eslint-plugin-node-security': patch
---

fix(node-security): `no-weak-hash-algorithm` reports `createHash('sha-1')`

Node accepts `'sha-1'` and `'SHA-1'` for the same digest as `'sha1'`, but the pattern only
matched the unhyphenated spelling, so a password hashed with `createHash('sha-1')` was not
reported. Found by the Quint fidelity check (`npm run fidelity`).

Also from the devkit resolver fix: `detect-non-literal-fs-filename` now sees
`const { promises: { readFile } } = require('fs')` and an object rest of `fs`, and
`no-unbounded-decompression` sees an object rest of `zlib`.
