# no-self-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid a module from importing itself

## Rule Details

This rule aims to prevent issues related to self-import.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowInTests": {
        "type": "boolean",
        "default": false,
        "description": "Allow self-imports in test files."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-self-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-self-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
