# no-useless-path-segments

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid unnecessary path segments in import and require statements

## Rule Details

This rule aims to prevent issues related to useless-path-segments.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "noUselessIndex": {
        "type": "boolean",
        "default": false
      },
      "commonjs": {
        "type": "boolean",
        "default": true
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

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-useless-path-segments.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-useless-path-segments.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
