# no-barrel-file

> No Barrel File
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Disallow barrel files that harm build performance and tree-shaking efficiency

## Rule Details

This rule aims to prevent issues related to barrel-file.

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
      "threshold": {
        "type": "number",
        "minimum": 1,
        "default": 3,
        "description": "Minimum number of re-exports to consider a file a barrel"
      },
      "allowedPaths": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Regex patterns for paths where barrel files are allowed"
      },
      "barrelPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          ".*[/\\\\]index\\.(ts|tsx|js|jsx|mts|mjs)$"
        ],
        "description": "File patterns considered barrel candidates"
      },
      "allowWithLocalExports": {
        "type": "boolean",
        "default": false,
        "description": "Allow barrel files that also export local declarations"
      },
      "reexportRatio": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "default": 0.8,
        "description": "Maximum allowed ratio of re-exports to total exports"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-barrel-file.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-barrel-file.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
