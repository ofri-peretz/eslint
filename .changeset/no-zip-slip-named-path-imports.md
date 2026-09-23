---
'eslint-plugin-node-security': patch
---

`no-zip-slip`: recognise the entry-path join when `join`/`resolve`/`relative`/`normalize` is imported by name — `import { join } from 'node:path'` (also `path`, `path/posix`, `node:path/posix`, renamed specifiers) or `const { join } = require('path')`. Previously only the member form `path.join(dest, entry.name)` reported, so ESM code extracting archives was silent. The callee is resolved through its import binding, so a locally defined `join` still does not report.
