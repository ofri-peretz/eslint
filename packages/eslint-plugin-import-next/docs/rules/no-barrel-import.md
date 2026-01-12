# no-barrel-import

> No Barrel Import
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Disallow imports from barrel files to improve build performance and tree-shaking

## Rule Details

This rule aims to prevent issues related to barrel-import.

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
      "knownBarrels": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Regex patterns for paths known to be barrels"
      },
      "ignoreNodeModules": {
        "type": "boolean",
        "default": true,
        "description": "Ignore imports from node_modules"
      },
      "ignoredPackages": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Packages to ignore (good tree-shaking support)"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-barrel-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-barrel-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
