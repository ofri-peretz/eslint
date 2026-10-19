---
'@interlace/eslint-devkit': patch
'eslint-plugin-node-security': patch
'eslint-plugin-cli-floor': patch
---

`resolveModuleBinding` resolves a static computed destructuring key: `const { ['promises']: fsp } = require('node:fs')` names `fs.promises` like `{ promises: fsp }` does. A runtime key (`{ [k]: v }`) still abstains. node-security's `no-arbitrary-file-access`, `no-static-iv` and `no-unbounded-decompression` now report that spelling; cli-floor drops its local copy of the same resolution.
