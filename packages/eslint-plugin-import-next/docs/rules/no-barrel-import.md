# no-barrel-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Disallow imports from barrel files to improve build performance and tree-shaking

## Rule Details

This rule aims to prevent issues related to barrel-import.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "knownBarrels": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Regex patterns for paths known to be barrels"
      },
      "ignoreNodeModules": {
        "type": "boolean",
        "default": true,
        "description": "Ignore imports from node_modules"
      },
      "ignoredPackages": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Packages to ignore (good tree-shaking support)"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-barrel-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-barrel-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
