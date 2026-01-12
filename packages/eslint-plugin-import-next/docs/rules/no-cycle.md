# no-cycle

> No Cycle
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Detect circular dependencies that cause bundle memory bloat and initialization issues

## Rule Details

This rule aims to prevent issues related to cycle.

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
        "default": 5,
        "description": "Maximum depth to traverse when detecting cycles (performance optimization)"
      },
      "ignorePatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.spec.ts",
          "**/*.spec.tsx",
          "**/*.stories.tsx",
          "**/__tests__/**",
          "**/__mocks__/**"
        ],
        "description": "File patterns to ignore (glob patterns)"
      },
      "barrelExports": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "index.ts",
          "index.tsx",
          "index.js",
          "index.jsx"
        ],
        "description": "Files considered barrel exports"
      },
      "reportAllCycles": {
        "type": "boolean",
        "default": true,
        "description": "Report all circular dependencies found (not just the first one)"
      },
      "fixStrategy": {
        "type": "string",
        "enum": [
          "module-split",
          "direct-import",
          "extract-shared",
          "dependency-injection",
          "auto"
        ],
        "default": "auto",
        "description": "Strategy for fixing circular dependencies (auto = smart detection)"
      },
      "moduleNamingConvention": {
        "type": "string",
        "enum": [
          "semantic",
          "numbered"
        ],
        "default": "semantic",
        "description": "Naming convention for split modules (semantic: .core, .api | numbered: .1, .2)"
      },
      "coreModuleSuffix": {
        "type": "string",
        "default": "core",
        "description": "Suffix for core module when splitting (e.g., \"core\", \"base\", \"main\")"
      },
      "extendedModuleSuffix": {
        "type": "string",
        "default": "extended",
        "description": "Suffix for extended module when splitting (e.g., \"extended\", \"api\", \"helpers\")"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-cycle.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-cycle.test.ts)

## OWASP Foundation

- **Category**: A05:2021 - Security Misconfiguration
