# order

> Order
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforces a specific order for import statements

## Rule Details

This rule aims to prevent issues related to order.

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
      "groups": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
            "side-effect"
          ]
        }
      },
      "internalPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "alphabetize": {
        "type": "object",
        "properties": {
          "order": {
            "type": "string",
            "enum": [
              "asc",
              "desc",
              "ignore"
            ]
          },
          "caseInsensitive": {
            "type": "boolean"
          }
        },
        "additionalProperties": false
      },
      "newlinesBetween": {
        "type": "string",
        "enum": [
          "always",
          "never",
          "ignore"
        ]
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/order.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/order.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
