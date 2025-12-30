# no-restricted-paths

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Enforce which files can be imported in a given folder

## Rule Details

This rule aims to prevent issues related to restricted-paths.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "restricted": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Array of restricted path patterns"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-restricted-paths.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-restricted-paths.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
