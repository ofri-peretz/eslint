# no-legacy-imports

> No Legacy Imports
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Detect imports from deprecated internal paths and suggest alternatives

## Rule Details

This rule aims to prevent issues related to legacy-imports.

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
      "mappings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "deprecated": {
              "type": "string"
            },
            "replacement": {
              "type": "string"
            },
            "reason": {
              "type": "string"
            },
            "since": {
              "type": "string"
            },
            "deadline": {
              "type": "string"
            }
          },
          "required": [
            "deprecated",
            "replacement"
          ]
        }
      },
      "severity": {
        "type": "string",
        "enum": [
          "warn",
          "error"
        ],
        "default": "warn"
      }
    },
    "required": [
      "mappings"
    ],
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-legacy-imports.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-legacy-imports.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
