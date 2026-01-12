# enforce-dependency-direction

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Ensures dependencies flow in the correct architectural direction

## Rule Details

This rule aims to prevent issues related to enforce-dependency-direction.

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

### Cross-Module Data Flow

**Why**: ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.

```typescript
// ❌ NOT DETECTED - Re-exported module
import { exported } from './reexports';
// Rule doesn't check original source
```

**Mitigation**: Apply the same rule to imported modules. Use module boundaries and explicit exports.


## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/enforce-dependency-direction.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/enforce-dependency-direction.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
