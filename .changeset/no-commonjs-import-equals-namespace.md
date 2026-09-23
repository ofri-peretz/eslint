---
'eslint-plugin-import-next': patch
---

fix(import-next): `no-commonjs` suggests `import * as x` for `import x = require()`

`import x = require('m')` binds the whole module, but the suggestion rewrote it to a default import,
which fails to compile (TS1192) against a module with only named exports. It now suggests a namespace
import, keeps the `type` modifier on `import type x = require()`, and offers no suggestion for
`export import x = require()`, where the old rewrite produced a syntax error.
