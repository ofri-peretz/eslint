# no-internal-modules

> No Internal Modules
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid importing the submodules of other modules

## Rule Details

This rule aims to prevent issues related to internal-modules.

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
