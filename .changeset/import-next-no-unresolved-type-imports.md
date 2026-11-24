---
'eslint-plugin-import-next': patch
---

fix: no-unresolved skips type-only imports and re-exports, as eslint-plugin-import does

`import type { X } from 'pkg'` and `export type { X } from 'pkg'` are erased, so a package that is not installed is not a resolution failure. eslint-plugin-import returns before resolving when the declaration's `importKind` or `exportKind` is `type` (no-unresolved.js:33, v2.32.0); import-next only allowed this for `@types/*`. An inline `import { type X }` is a value declaration upstream and is still resolved. 72 of 75 extra findings on workadventure were `import type` lines (workadventure/workadventure).
