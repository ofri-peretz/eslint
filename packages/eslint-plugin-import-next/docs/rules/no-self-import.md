# no-self-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid a module from importing itself

## Rule Details

A module that loads itself is reported, in every way a module is loaded at runtime: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

The specifier names this file when it resolves to it: `./app`, `./app.js` (TypeScript maps the `.js` output extension to the `.ts` source), `./app.ts`, or any path back to the same file (`../src/app`). For an index file, the directory itself is the file: `.`, `./` and `../lib` from `lib/index.ts`.

Not reported: a different file (`./app.tsx` from `app.ts`, `./app.css`, `./app.test.constants`), a package, `import type` and imports whose every specifier is an inline `type` (erased, so nothing loads), and a call to a `require` the file declares itself (not Node's loader). `allowInTests` skips test files.

### ❌ Incorrect

```ts
// src/app.ts
import { helper } from './app';
export * from './app.js';
const self = require('../src/app');

// src/lib/index.ts
import { util } from '.';
```

### ✅ Correct

```ts
// src/app.ts
import { helper } from './helper';
import styles from './app.css';
import type { Config } from './app';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowInTests": {
        "type": "boolean",
        "default": false,
        "description": "Allow self-imports in test files."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-self-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-self-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
