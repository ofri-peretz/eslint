# enforce-team-boundaries

> Enforce Team Boundaries
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prevent unauthorized cross-team imports in large codebases

## Rule Details

This rule aims to prevent issues related to enforce-team-boundaries.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


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
