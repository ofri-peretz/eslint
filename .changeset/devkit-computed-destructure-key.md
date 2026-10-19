---
'@interlace/eslint-devkit': patch
---

`resolveModuleBinding` resolves a static computed destructuring key: `const { ['promises']: fsp } = require('node:fs')` names `fs.promises` like `{ promises: fsp }` does. A runtime key (`{ [k]: v }`) still abstains.
