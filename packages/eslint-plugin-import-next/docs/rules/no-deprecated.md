# no-deprecated

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid imported names marked with @deprecated documentation tag

## Rule Details

This rule aims to prevent issues related to deprecated.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allow": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "List of deprecated items that are allowed (for migration periods)"
      },
      "deprecationMarkers": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "@deprecated"
        ],
        "description": "Custom deprecation markers to look for in comments"
      },
      "checkJSDoc": {
        "type": "boolean",
        "default": true,
        "description": "Check for @deprecated in JSDoc comments"
      },
      "checkDecorators": {
        "type": "boolean",
        "default": true,
        "description": "Check for @deprecated decorator in TypeScript"
      }
    },
    "additionalProperties": false
  }
]
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Import path from variable
const moduleName = getModuleName();
import(moduleName); // Dynamic import not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Cross-Module Data Flow

**Why**: ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.

```typescript
// ❌ NOT DETECTED - Re-exported module
import { exported } from './reexports';
// Rule doesn't check original source
```

**Mitigation**: Apply the same rule to imported modules. Use module boundaries and explicit exports.


## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-deprecated.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-deprecated.test.ts)

## OWASP Foundation

- **Category**: A09:2021 - Security Logging and Monitoring Failures
