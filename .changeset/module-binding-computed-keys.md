---
'@interlace/eslint-devkit': minor
---

fix: module-member resolution reads a string subscript

`isModuleBinding` resolves whether an expression names an export of a known
module — the evidence gate behind rules across a dozen plugins. Its member arm
refused any computed access, so `child_process['exec']`, `new pg['Pool']()`,
`express['Router']()`, `mongoose['connect']()` and
`require('fs').promises['readFile']` all resolved to nothing and their rules
stood down.

`propertyName` still abstains on the two shapes that genuinely name no export:
a `#private` field and a key chosen at runtime.
