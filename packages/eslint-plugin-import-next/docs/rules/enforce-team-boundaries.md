# enforce-team-boundaries

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prevent unauthorized cross-team imports in large codebases

## Rule Details

This rule aims to prevent issues related to enforce-team-boundaries.

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Import path from variable
const moduleName = getModuleName();
import(moduleName); // Dynamic import not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Cross-Module Data Flow

**Why**: ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.

```typescript
// ❌ NOT DETECTED - Re-exported module
import { exported } from './reexports';
// Rule doesn't check original source
```

**Mitigation**: Apply the same rule to imported modules. Use module boundaries and explicit exports.

### Dynamic Property Access

**Why**: Dynamic property access and computed method names cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Computed property
const methodName = 'execute';
obj[methodName](data); // Dynamic access not tracked
```

**Mitigation**: Use explicit property access. Avoid dynamic method invocation with sensitive operations.


## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/enforce-team-boundaries.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/enforce-team-boundaries.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
