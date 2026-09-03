# no-amd

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prevents AMD require/define calls

## Rule Details

This rule aims to prevent issues related to amd.

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
        "description": "AMD patterns to allow."
      },
      "suggestES6": {
        "type": "boolean",
        "default": true,
        "description": "Suggest ES6 imports instead."
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-amd.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-amd.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
