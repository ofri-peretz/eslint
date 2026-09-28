---
'eslint-plugin-import-next': patch
---

fix(import-next): `no-barrel-file` no longer counts a forwarded type-only import as a local export

`import type { T } from './t'; export { T };` is erased before any bundler runs, like
`export type { T }`, but the name was missing from the import map and was counted as a
local export. That demoted a pure barrel to the mixed path: it reported
`considerDirectExports` instead of `barrelFileDetected`, and nothing at all under
`allowWithLocalExports: true`. Names bound by `import type` or `import { type X }` are
now skipped in a sourceless export clause, as type-marked specifiers already were.
