# max-dependencies

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Enforce the maximum number of dependencies a module can have

## Rule Details

A module that depends on too many external packages is doing too much. The rule counts the distinct external packages a file loads or re-exports (`import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`) and reports the file when the count exceeds `max` (default 10). Packages are counted by name: `lodash` and `lodash/get` are one package, as are `@scope/pkg` and `@scope/pkg/x`.

Not counted: relative and absolute paths, `#` subpath imports (the package's own files), Node.js builtins in any spelling (Node's own list, subpaths included, or the `node:` scheme), specifiers listed in `ignoreImports` (exact match), and - with `ignoreTypeImports` (default `true`) - `import type` / `export type`. Files matching an `ignoreFiles` pattern (a substring, or `*` wildcards) are skipped.

### ❌ Incorrect

```ts
// { max: 2 }
import a from 'pkg-a';
import b from 'pkg-b';
export * from 'pkg-c';
```

### ✅ Correct

```ts
// { max: 2 }
import a from 'pkg-a';
import get from 'pkg-a/get';
import b from 'pkg-b';
import fs from 'node:fs';
import helper from './helper';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "max": {
        "type": "number",
        "minimum": 1,
        "default": 10,
        "description": "Maximum number of dependencies allowed."
      },
      "ignoreTypeImports": {
        "type": "boolean",
        "default": true,
        "description": "Ignore type-only imports."
      },
      "ignoreImports": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Import sources to ignore."
      },
      "ignoreFiles": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "File patterns to ignore."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/max-dependencies.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/max-dependencies.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
