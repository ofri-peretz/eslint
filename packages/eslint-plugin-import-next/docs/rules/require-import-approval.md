# require-import-approval

> Require Import Approval
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce explicit approval for high-risk package imports

## Rule Details

This rule aims to prevent issues related to require-import-approval.

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
      "packages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "package": {
              "type": "string"
            },
            "status": {
              "type": "string",
              "enum": [
                "approved",
                "pending",
                "blocked"
              ]
            },
            "reason": {
              "type": "string"
            },
            "alternative": {
              "type": "string"
            },
            "approvedBy": {
              "type": "string"
            },
            "approvedDate": {
              "type": "string"
            }
          },
          "required": [
            "package",
            "status"
          ]
        }
      },
      "defaultPolicy": {
        "type": "string",
        "enum": [
          "allow",
          "deny"
        ],
        "default": "allow"
      },
      "ignorePatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": []
      }
    },
    "required": [
      "packages"
    ],
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/require-import-approval.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/require-import-approval.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
