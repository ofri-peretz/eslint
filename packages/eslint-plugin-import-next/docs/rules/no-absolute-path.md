# no-absolute-path

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Forbid import of modules using absolute paths

## Rule Details

This rule aims to prevent issues related to absolute-path.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "esmodule": {
        "type": "boolean",
        "default": true
      },
      "commonjs": {
        "type": "boolean",
        "default": true
      },
      "amd": {
        "type": "boolean",
        "default": false
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-absolute-path.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-absolute-path.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
