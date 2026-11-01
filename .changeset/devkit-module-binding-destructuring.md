---
'@interlace/eslint-devkit': patch
---

fix(devkit): resolve nested, defaulted and rest destructuring, and `import x = require()`

`resolveModuleBinding` gave up on four common spellings, so every rule built on it missed the call:

- `const { promises: { readFile } } = require('fs')` (nested pattern)
- `const { exec: run = noop } = require('child_process')` (defaulted)
- `const { ...cp } = require('child_process')` (object rest)
- `import cp = require('child_process')` (TypeScript import-equals)

All four now resolve to the module export they name. `isStaticExpression` recognises path helpers
the same way, so `require('path').join(...)`, `path.posix.join(...)` and
`import { join } from 'node:path'` are static, and a reassigned `path` binding is no longer taken
for the module.
