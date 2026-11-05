# enforce-team-boundaries

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Prevent unauthorized cross-team imports in large codebases

## Rule Details

Prevents a team's code from depending on another team's internals without permission. `teams` assigns path globs to each team (`paths`, `*` within a segment, `**` across) and lists the teams it may depend on (`allowedDependencies`). Every way a module is loaded or re-exported is checked: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

A module's owner is decided by the path its specifier names: a project-rooted path (`src/auth/x`) as written, a relative path once resolved against the importing file (`../../auth/x` from `src/platform/features/a.ts` is `src/auth/x`). An import from another team that is not in `allowedDependencies` is reported. Paths matching `sharedPaths` belong to everyone. With `allowExternalPackages` (default `true`) a package specifier is never checked; with `false`, a package listed in a team's `paths` or `publicPackages` belongs to that team.

Not reported: a file no team owns, or a module in the same team, an allowed team, a shared path, or no team.

### ❌ Incorrect

```ts
// src/platform/middleware/auth.ts
import { validateToken } from '../../auth/utils/token';
export * from 'src/payments/services/payment';
```

### ✅ Correct

```ts
// src/payments/hooks/useSearch.ts
import { Logger } from '../../platform/logger';
import { formatDate } from 'src/utils/date';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "teams": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "team": {
              "type": "string"
            },
            "paths": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "allowedDependencies": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "publicPackages": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "team",
            "paths"
          ]
        }
      },
      "sharedPaths": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": []
      },
      "allowExternalPackages": {
        "type": "boolean",
        "default": true
      }
    },
    "required": [
      "teams"
    ],
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/enforce-team-boundaries.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/enforce-team-boundaries.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
