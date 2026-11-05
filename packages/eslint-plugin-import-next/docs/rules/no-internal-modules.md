# no-internal-modules

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Forbid importing the submodules of other modules

## Rule Details

Code should import a module through its entry point, not reach into its files. Every way a module is loaded or re-exported is checked: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

A specifier's depth is how many path segments it goes past the module root: a package (`lodash` 0, `lodash/get` 1, `lodash/fp/get` 2), a scoped package (`@org/ui` 0, `@org/ui/button` 1), a relative path (each segment after the `./` / `../` prefix: `./utils` 1, `./utils/helpers` 2, `../../a/b` 2). A trailing slash names the same module (`./utils/` is `./utils`). A specifier deeper than `maxDepth` (default 1), or matching a `forbid` glob, is reported - unless it matches an `allow` or `ignorePaths` glob (`*` within a segment, `**` across segments). `strategy` (`error`, `warn`, `autofix`, `suggest`) only decides how a finding is fixed.

### ❌ Incorrect

```ts
import helpers from './utils/helpers';
import get from 'lodash/fp/get';
export * from '@org/ui/button/icon';
```

### ✅ Correct

```ts
import utils from './utils';
import get from 'lodash/get';
// { allow: ['lodash/**'] }
import fpGet from 'lodash/fp/get';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "maxDepth": {
        "type": "number",
        "minimum": 0,
        "default": 1,
        "description": "Maximum allowed depth of module imports (0 = only root, 1 = one level deep)"
      },
      "allow": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Glob patterns for paths that are allowed regardless of depth"
      },
      "forbid": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Glob patterns for paths that are explicitly forbidden"
      },
      "ignorePaths": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Glob patterns for paths to ignore completely"
      },
      "strategy": {
        "type": "string",
        "enum": [
          "error",
          "warn",
          "autofix",
          "suggest"
        ],
        "default": "error",
        "description": "How to handle violations: error (report), warn (report), autofix (fix automatically), suggest (provide suggestions)"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-internal-modules.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-internal-modules.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
