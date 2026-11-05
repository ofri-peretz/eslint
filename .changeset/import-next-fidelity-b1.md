---
'eslint-plugin-import-next': patch
---

fix(import-next): module-graph rules read every spelling and decide by binding, found by fidelity models for export, default, named, namespace, no-duplicates, no-self-import, no-unused-modules, no-named-as-default, no-named-as-default-member and no-deprecated.

- export: decides by TypeScript's declaration-merging table. Reports a destructured export (`export const { a } = o`), an `export namespace`, a class or enum beside a same-named type alias, and an export specifier (`export type { T as N }`, `export { v }` beside `export type { v } from`) beside a same-named value; no longer reports two enums that merge (`enum E { A = 0 }` + `enum E { B }`). A namespace of types only merges with any same-named export except `export * as`.
- default: checks `import { default as x }` and `export { default } from` too.
- named: checks `export { a } from` and `export { a as b } from`; leaves `import { default as x }` to `default` (one finding, not two).
- namespace: checks `ns['missing']` and `const { missing } = ns`; no longer reports a runtime key `ns[k]` or a namespace of a module that does not resolve.
- no-duplicates: one module is the file the resolver sees (`./m` and `./m.js` / `./m.ts`); a namespace import beside a named import is not a duplicate (they cannot be one statement); imports in two `declare module` blocks are not duplicates. The fix no longer splices a default into another import's braces.
- no-self-import: `.`, `./` and `../lib` from `lib/index.ts`, and `import x = require()` are self-imports; `./app.tsx` from `app.ts` (or `./helpers.ts` from `helpers.js`) is another file; an all-inline-`type` import and a locally declared `require` are not loads; a relative filename resolves like the specifier.
- no-unused-modules: `module.exports.a =`, `Object.defineProperty(exports, …)` and `Object.assign(module.exports, …)` are exports; a parameter named `exports` is not; `allowImportOnly` counts `require()` and `import x = require()` as imports.
- no-named-as-default / no-named-as-default-member: the evidence of a named export is any import or re-export of that name from the same module in the file, and the default may be spelled `import { default as x }`; member reads are followed by binding (a shadowing parameter is not the import) and include `const { bar } = foo`; a type of the same name is not evidence.
- no-deprecated: reports imports of deprecated exports (and `ns.old` reads) with type information, as the rule's description always said; same-file uses are followed by binding, so a parameter or object key sharing the name is not reported; `deprecationMarkers` adds to `@deprecated` instead of replacing it.

Docs for all ten rules state the real contract instead of a template line.
