# no-restricted-paths

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Enforce which files can be imported in a given folder

## Rule Details

Code must not import the paths the user restricts. Each `restricted` entry is one or more path segments (`server`, `app/server`); a specifier is restricted when it contains those segments, in order, as whole path segments. Every way a module is loaded or re-exported is checked: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`. The default `[]` restricts nothing.

The specifier is matched as written; it is not resolved, so restrict the segments your imports actually spell.

Not reported: a specifier that only contains the pattern inside a segment name: with `restricted: ['server']`, `./observer` and `./server-utils` are not the `server` path.

### ❌ Incorrect

```ts
// { restricted: ['server'] }
import db from '../server/db';
export { db } from '@/server/db';
```

### ✅ Correct

```ts
// { restricted: ['server'] }
import observer from './observer';
import utils from './server-utils';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "restricted": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Array of restricted path patterns"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-restricted-paths.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-restricted-paths.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
