---
'@interlace/eslint-devkit': minor
---

feat(devkit): `createRule` accepts oxlint's `createOnce` rule shape

A rule can now be written as `createOnce(context, options)`, returning its
visitors plus optional `before()` / `after()` hooks: oxlint's rule shape. The
creator exposes that `createOnce` to oxlint as-is, and derives ESLint's
`create` from it, so one rule object runs on both engines. `options()` returns
the current file's options with defaults applied. `skipTestFiles`,
`skipGeneratedFiles` and `skipMinifiedFiles` still apply on both engines. No
new dependency: this is our own adapter, not `@oxlint/plugins`.
