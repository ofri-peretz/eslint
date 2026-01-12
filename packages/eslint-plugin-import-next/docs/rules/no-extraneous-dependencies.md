# no-extraneous-dependencies

> No Extraneous Dependencies
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid the use of extraneous packages not listed in package.json

## Rule Details

This rule aims to prevent issues related to extraneous-dependencies.

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
      "devDependencies": {
        "type": "boolean",
        "default": true,
        "description": "Allow imports from devDependencies."
      },
      "optionalDependencies": {
        "type": "boolean",
        "default": true,
        "description": "Allow imports from optionalDependencies."
      },
      "peerDependencies": {
        "type": "boolean",
        "default": true,
        "description": "Allow imports from peerDependencies."
      },
      "bundledDependencies": {
        "type": "boolean",
        "default": true,
        "description": "Allow imports from bundledDependencies."
      },
      "packageJsonPath": {
        "type": "string",
        "description": "Path to package.json file to use."
      },
      "packageJson": {
        "type": "object",
        "description": "Direct package.json content for testing."
      },
      "resolutionStrategy": {
        "type": "string",
        "enum": [
          "strict",
          "workspace",
          "monorepo"
        ],
        "default": "strict",
        "description": "Dependency resolution strategy: strict (exact match), workspace (allow workspace packages), monorepo (cross-package resolution)."
      },
      "allowPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Regex patterns for packages to allow even if not in package.json."
      },
      "ignore": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Specific package names to ignore (don't report as missing)."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-extraneous-dependencies.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-extraneous-dependencies.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
