# default

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Ensure a default export is present, given a default import

## Rule Details

A default import of a module that has no default export is reported. Every spelling of taking the default counts: `import x from './m'`, `import x, { a } from './m'`, `import { default as x } from './m'`, and `export { default } from './m'`.

The module has a default when TypeScript sees one: `export default`, `export { v as default }`, a re-exported default (`export { default } from './inner'`), or a CommonJS `module.exports =` / `export =` module (default interop). `export * from` does not re-export a default, so a module that only star-exports has none.

With type information (`parserOptions.project` or `projectService`) the module's default is what TypeScript sees. The rule is silent when the module does not resolve (that is `no-unresolved`'s finding, not a missing default), for a namespace import (`import * as x`), and for `import type x` (TypeScript checks it).

Without type information (no `parserOptions.project` or `projectService`), the rule reads the imported module itself, as eslint-plugin-import does: it resolves the specifier with the node-resolver settings (`import/resolver.node`, `import/resolve`; extensions `.mjs`, `.js`, `.json`, `.node`, or TypeScript's when the config names a TypeScript resolver), parses the file with the parser `import/parsers` maps its extension to (else the one linting this file), and lists what it exports, following `export { … } from` and `export * from`. Only files with an extension the config parses are read (`import/extensions`, default `.js`, `.mjs`, `.cjs`, plus every extension in `import/parsers`); files matching `import/ignore`, files over 1 MB, and files with no `import`/`export` syntax (CommonJS) are unknown, and an unknown module is never a finding. Each file is parsed once per run. A name reached only through an `export *` of a module that is not known (it does not resolve, is ignored, or does not parse) may be there, so it is not reported missing; and in a TypeScript file a JavaScript module is unknown, since its declaration file may add names its source does not show. On oxlint, which gives a plugin no parser to call, the rule does not read other modules. Read that way, a CommonJS module is unknown (not a module with a default), and a module that does not parse is reported (`Parse errors in imported module`).

### ❌ Incorrect

```ts
// ./math.ts: export const add = (a: number, b: number) => a + b;
import math from './math';
import { default as m } from './math';
export { default } from './math';
```

### ✅ Correct

```ts
import { add } from './math';
import * as math from './math';
import React from 'react'; // `export =` module: default interop
```

## Options

```json
[]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/default.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/default.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
