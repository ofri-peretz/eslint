# prefer-default-export

> Prefer Default Export
**CWE:** [CWE-276](https://cwe.mitre.org/data/definitions/276.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prefer a default export if module exports a single name

## Rule Details

This rule aims to prevent issues related to prefer-default-export.

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
      "target": {
        "type": "string",
        "enum": [
          "always",
          "single",
          "as-needed"
        ],
        "default": "single",
        "description": "When to enforce default exports: always (all), single (single export), as-needed (when beneficial)"
      },
      "ignoreFiles": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "File patterns to ignore"
      },
      "allowNamedExports": {
        "type": "boolean",
        "default": false,
        "description": "Allow named exports without warnings"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-default-export.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-default-export.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
