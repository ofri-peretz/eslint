# prefer-modern-api

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Suggest modern replacements for deprecated or outdated libraries

## Rule Details

Suggests a modern replacement when code imports an outdated package. Every way a module is loaded or re-exported is checked: `import`, side-effect `import`, `export … from`, `export * from`, `require()`, `import()` and TypeScript's `import x = require()`.

`customMappings` entries name the outdated package or a path inside one (`deprecated`), the replacement (`modern`) and a `reason`; a specifier matches when it is that package or path, or anything below it. Unless `disableBuiltIn` is `true`, a built-in list of packages the plugin considers outdated is checked as well (moment, request, underscore, mocha, redux, joi, webpack and others).

Not reported: a different package that shares a prefix (`old-lib-ng` for `old-lib`), a sibling of a deprecated path (`kit/modern` for `kit/legacy`), relative paths.

### ❌ Incorrect

```ts
// { customMappings: [{ deprecated: 'kit/legacy', modern: 'kit/modern', reason: 'replaced' }] }
import legacy from 'kit/legacy';
export * from 'kit/legacy/x';
```

### ✅ Correct

```ts
import modern from 'kit/modern';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "customMappings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "deprecated": {
              "type": "string"
            },
            "modern": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "difficulty": {
              "type": "string",
              "enum": [
                "easy",
                "medium",
                "hard"
              ]
            },
            "migrationGuide": {
              "type": "string"
            }
          },
          "required": [
            "deprecated",
            "modern",
            "reason"
          ]
        }
      },
      "disableBuiltIn": {
        "type": "boolean",
        "default": false
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-modern-api.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-modern-api.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
