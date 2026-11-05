# unambiguous

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid potentially ambiguous parse goal (script vs. module)

## Rule Details

Tools that follow the Unambiguous JavaScript Grammar decide between script and module from the syntax alone. A file with no `import` or `export` parses as a script too, so a tool may load your module in the wrong mode. This rule reports a module file with code but no module syntax.

Module syntax is: an `import` declaration (also type-only and side-effect), any `export` (also `export {}` and TS `export =`), TS `import x = require('m')` (TypeScript treats the file as a module), and `import.meta` (a syntax error in a script). A dynamic `import()` is legal in a script, so it does not disambiguate.

Not reported: an empty file, a file with a `'use strict'` directive (its author stated a parse mode), and a file the config parses as a script or CommonJS, or a `.cjs` / `.cts` file (CommonJS by its extension).

### ❌ Incorrect

```ts
const a = 1;
console.log(a);

const lazy = () => import('./a');
```

### ✅ Correct

```ts
import a from './a';
console.log(a);

console.log(import.meta.url);

const b = 1;
export {};
```

## Options

```json
[]
```

No options.

## When Not To Use It

When every consumer of your files is told the parse mode explicitly (`"type": "module"`, `.mjs`, bundler config).
