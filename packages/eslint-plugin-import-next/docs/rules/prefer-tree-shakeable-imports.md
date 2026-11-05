# prefer-tree-shakeable-imports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Prefer import patterns that enable effective tree-shaking

## Rule Details

Prefers import forms a bundler can tree-shake. For each package in `targetPackages`, the rule reports a namespace import of the package or one of its subpaths, and a default import of the package itself. With `blockAllNamespaceImports` every namespace import is reported. `subpathPattern` and `preferNamed` only shape the message. When `targetPackages` is not set, a built-in list is used (lodash, @mui/material, @mui/icons-material, date-fns, rxjs, ramda, antd and others).

Not reported: named imports, a default import of a subpath (`import debounce from 'lodash/debounce'`), side-effect imports, and type-only imports (`import type X from 'pkg'`, `import type * as X from 'pkg'`): they are erased and bundle nothing.

### ❌ Incorrect

```ts
import * as _ from 'lodash';
import dateFns from 'date-fns';
```

### ✅ Correct

```ts
import { debounce } from 'lodash';
import format from 'date-fns/format';
import type * as Fns from 'date-fns';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "targetPackages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "subpathPattern": {
              "type": "string"
            },
            "preferNamed": {
              "type": "boolean"
            }
          },
          "required": [
            "name"
          ]
        },
        "default": [],
        "description": "Packages to enforce tree-shakeable imports"
      },
      "blockAllNamespaceImports": {
        "type": "boolean",
        "default": false,
        "description": "Block all namespace imports"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-tree-shakeable-imports.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-tree-shakeable-imports.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
