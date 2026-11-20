---
'eslint-plugin-modularity': patch
---

fix: two false positives found by linting NestJS and Hono

`no-mutable-exports` skips ambient declarations (`.d.ts`, `declare module` / `namespace` / `global`, `export declare let`). They describe a binding that lives elsewhere, importers cannot reassign them, and the autofix to `const` would rewrite a published type.

`enforce-rest-conventions` skips test files (`*.test.*`, `*.spec.*`, `__tests__/`), whose route strings are fixtures. On Hono's `src/` this removes 517 findings.
