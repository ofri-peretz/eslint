# prefer-tree-shakeable-imports

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Prefer import patterns that enable effective tree-shaking

## Rule Details

This rule aims to prevent issues related to prefer-tree-shakeable-imports.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "targetPackages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "subpathPattern": {
              "type": "string"
            },
            "preferNamed": {
              "type": "boolean"
            }
          },
          "required": [
            "name"
          ]
        },
        "default": [],
        "description": "Packages to enforce tree-shakeable imports"
      },
      "blockAllNamespaceImports": {
        "type": "boolean",
        "default": false,
        "description": "Block all namespace imports"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-tree-shakeable-imports.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-tree-shakeable-imports.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
