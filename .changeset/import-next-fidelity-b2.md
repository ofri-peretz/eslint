---
'eslint-plugin-import-next': patch
'@interlace/eslint-devkit': patch
---

fix(import-next): module-graph rules read every import spelling, judge what a specifier resolves to, and stay silent on what they cannot know, found by fidelity models for no-unresolved, no-cycle, extensions, no-useless-path-segments, no-relative-packages, no-extraneous-dependencies, no-barrel-file, no-barrel-import and prefer-direct-import.

- Missing spellings: `export { a } from`, `export * from`, `require()` and TS `import x = require()` are now read by no-useless-path-segments, no-relative-packages, no-extraneous-dependencies, extensions (require / import =), no-barrel-import (plus `import()`) and prefer-direct-import (`export { X } from`).
- no-cycle: `export * from`, `export * as ns from`, a top-level `require()` and `import x = require()` close a cycle on either side; an import that takes only interfaces or type aliases is erased like an inline-type one (unless `verbatimModuleSyntax`), also when the names arrive through a barrel (`export * from`, `export { A } from`, `export { A }` lists carry each name's kind from the module that declares it); a `require()` inside a function does not; `maxDepth` now bounds the search (it did nothing). The import graph (`@interlace/eslint-devkit` `getFileImports`) reads the same edges, and exports `exportKindsOf`.
- no-unresolved: a URL-scheme specifier (`virtual:routes`, `bun:test`) is not reported; a file resolver cannot judge it.
- extensions: a missing extension is judged by the policy for the resolved file's extension (`pattern: { ts: 'always' }` now reports `./dep`; `{ default: 'always', pattern: { ts: 'never' } }` no longer does); a specifier that does not resolve or only resolves as a directory is not reported; a dotted file name (`./source.config`) is judged as extensionless.
- no-useless-path-segments: `../src/dep` from `src/` is `./dep`; `noUselessIndex` only strips `/index` when the shorter path resolves to the same file (`./both/index` beside `both.ts` is kept); a trailing slash and `./.config/x` are left alone.
- no-relative-packages: a nameless package.json (a `{"type":"module"}` scope marker) is not a package boundary, a folder with one is not a target, and a package root itself (`../../other`) is fixed to `other`.
- no-extraneous-dependencies: `bundleDependencies` (npm's other spelling), the package's own name and a scope-marker package.json no longer produce false positives; `export type ... from` is ignored.
- no-barrel-file: type-only re-exports are not counted; `import x from './x'; export default x` counts as a re-export.
- no-barrel-import: type-only imports and re-exports are not reported; `ignoredPackages` works with `ignoreNodeModules: false`.
- prefer-direct-import: inline `type` specifiers are not reported, and an import mixing them is not auto-fixed.
- Docs: real contracts for all nine rules, replacing template text.
