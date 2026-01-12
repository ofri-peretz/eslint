# enforce-dependency-direction

> Enforce Dependency Direction
**CWE:** [CWE-829](https://cwe.mitre.org/data/definitions/829.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Ensures dependencies flow in the correct architectural direction

## Rule Details

This rule aims to prevent issues related to enforce-dependency-direction.

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
      "layers": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "domain",
          "application",
          "infrastructure",
          "presentation"
        ],
        "description": "Layer definitions with dependency order"
      },
      "layerPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "domain",
          "application",
          "infrastructure",
          "presentation",
          "ui",
          "api"
        ],
        "description": "Layer directory patterns"
      },
      "allowSameLayer": {
        "type": "boolean",
        "default": true,
        "description": "Allow same-layer imports"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/enforce-dependency-direction.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/enforce-dependency-direction.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
