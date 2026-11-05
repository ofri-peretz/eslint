# no-cross-domain-imports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Prevents imports across domain/feature boundaries

## Rule Details

A file inside a domain directory must not depend on another domain's files. A domain is the directory right below a `domainPatterns` directory (default `domains`, `features`, `modules`): `src/domains/user/handler.ts` is in domain `user`. Every way a module is loaded or re-exported is checked: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

A relative specifier is resolved against the importing file, and the target's domain is read from the path it resolves to: `../billing/service` from `src/domains/user/handler.ts` is `src/domains/billing/service`, domain `billing`, and is reported. Not reported: a file outside every domain; a target in the same domain, however it is spelled; a target outside every domain (`../../shared/x`); a target whose path passes through an `allowedSharedModules` directory (default `shared`, `common`, `utils`); a target a `customRules` entry allows (`from` matches the importing file, an `allowed` entry matches the resolved target); and packages - they never resolve into a domain directory, which is also why `ignoreNodeModules` has nothing to change.

### ❌ Incorrect

```ts
// src/domains/user/handler.ts
import { invoice } from '../billing/service';
export * from '../../domains/billing/model';
```

### ✅ Correct

```ts
// src/domains/user/handler.ts
import { repo } from './repo';
import { money } from '../../shared/money';
import { events } from '../billing/shared/events';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "domainPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "domains",
          "features",
          "modules"
        ],
        "description": "Domain/feature directory patterns"
      },
      "allowedSharedModules": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "shared",
          "common",
          "utils"
        ],
        "description": "Shared modules that can be imported"
      },
      "ignoreNodeModules": {
        "type": "boolean",
        "default": true,
        "description": "Ignore imports from node_modules"
      },
      "customRules": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "from": {
              "type": "string"
            },
            "to": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "allowed": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "from",
            "to"
          ]
        },
        "default": [],
        "description": "Custom domain boundary rules"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-cross-domain-imports.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-cross-domain-imports.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
