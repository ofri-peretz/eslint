---
'eslint-plugin-import-next': patch
'oxlint-plugin-import-next': patch
---

fix(import-next): path aliases, exported types and the resolver chain behave as in eslint-plugin-import

Three differences from eslint-plugin-import that a TypeScript config carried over unchanged turned into wrong findings:

- `no-extraneous-dependencies` no longer reports a path alias that resolves to a file of the package (`import { x } from '@/utils'` through tsconfig `paths`, or a bare name the node resolver finds in its `paths`) as a package missing from `package.json`. Such a module is internal, and internal modules are checked only under `includeInternal: true`, eslint-plugin-import's default. A file outside the linted file's package, or in `node_modules` or an `import/external-module-folders` folder, is external, as there. Before reporting, the rule also reads the name in the `package.json` of the resolved file, so an alias into another workspace package is accepted when that package is declared.
- `prefer-default-export` no longer reports a module that exports a type (`export type`, `export interface`, `export type { T }`, `export { type T }`) next to one value, under any target. A type alias cannot be a default export, and eslint-plugin-import leaves such a module alone. This fixes one of eslint-plugin-import's own valid test cases.
- Resolution now tries the resolvers in `settings['import/resolver']` in order until one finds the file. With `{ node: { extensions: ['.ts', '.json'] }, typescript: true }`, `./b` in a `.js` file now resolves to `b.js` through the typescript resolver after the node resolver misses it. Before, only the node resolver's extensions were tried, so `no-unresolved` reported the import and `extensions` missed `.js` extensions in `.js` files. `import/resolve` is read only when `import/resolver` is absent, as there.

Graded by eslint-plugin-import 2.32.0's own test suite, import-next now passes 2,035 of 2,135 cases (was 2,033).
