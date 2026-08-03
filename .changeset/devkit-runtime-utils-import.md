---
'@interlace/eslint-devkit': patch
---

Fix "Cannot find module '@typescript-eslint/utils'" on a clean install — every
published plugin was failing to load.

`rule-creation/sql-injection-rule.ts` imported `AST_NODE_TYPES` from
`@typescript-eslint/utils`. That is an **enum — a runtime value**, so the built
output emitted `require("@typescript-eslint/utils")`. But the devkit declares
that package as an `optional` peer dependency, which npm does not install. The
result: any project doing `npm i -D eslint-plugin-<any>` got a package that threw
on `require`.

Reproduced from nothing:

```
npm i -D eslint eslint-plugin-mongodb-security
node -e "require('eslint-plugin-mongodb-security')"
→ Error: Cannot find module '@typescript-eslint/utils'
```

Verified on `nestjs-security`, `secure-coding`, `node-security` and `jwt` too —
**all four failed identically**, so this affected the whole published ecosystem.

The fix keeps the zero-dependency goal intact: `AST_NODE_TYPES` now comes from the
local `../ast-node-types` shim that exists for exactly this reason, and
`TSESLint` / `TSESTree` become `import type`, which is erased at compile time.
No dependency added, no artifact-size regression.

A lock test asserts the built output contains no runtime `require` of
`@typescript-eslint/utils`, so this cannot regress silently again.
