# prefer-node-protocol

> Prefer Node Protocol
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prefer using the node: protocol when importing Node.js builtin modules

## Rule Details

This rule aims to prevent issues related to prefer-node-protocol.

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
      "additionalModules": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": []
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-node-protocol.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-node-protocol.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
