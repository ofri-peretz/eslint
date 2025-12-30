# no-unassigned-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prevents unassigned imports

## Rule Details

This rule aims to prevent issues related to unassigned-import.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowModules": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Allow specific modules to be imported without assignment."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-unassigned-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-unassigned-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
