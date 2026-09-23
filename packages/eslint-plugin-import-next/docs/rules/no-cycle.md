# no-cycle

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is automatically fixable by the `--fix` CLI option.

<!-- end auto-generated rule header -->

Detect circular dependencies that cause bundle memory bloat and initialization issues

## Rule Details

This rule aims to prevent issues related to cycle.

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "maxDepth": {
        "type": "number",
        "default": 5,
        "description": "Maximum depth to traverse when detecting cycles (performance optimization)"
      },
      "ignorePatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.spec.ts",
          "**/*.spec.tsx",
          "**/*.stories.tsx",
          "**/__tests__/**",
          "**/__mocks__/**"
        ],
        "description": "File patterns to ignore (glob patterns)"
      },
      "barrelExports": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "index.ts",
          "index.tsx",
          "index.js",
          "index.jsx"
        ],
        "description": "Files considered barrel exports"
      },
      "reportAllCycles": {
        "type": "boolean",
        "default": true,
        "description": "Report all circular dependencies found (not just the first one)"
      },
      "verbatimModuleSyntax": {
        "type": "boolean",
        "default": false,
        "description": "Treat an inline `import { type Foo }` specifier as a runtime edge. Set this when the project compiles with TypeScript's `verbatimModuleSyntax`, under which the inline form is emitted as `import {} from './foo.js'` rather than erased — so the target module is still evaluated and the cycle is real. A statement-level `import type` is erased under every setting and stays skipped either way."
      },
      "fixStrategy": {
        "type": "string",
        "enum": [
          "module-split",
          "direct-import",
          "extract-shared",
          "dependency-injection",
          "auto"
        ],
        "default": "auto",
        "description": "Strategy for fixing circular dependencies (auto = smart detection)"
      },
      "moduleNamingConvention": {
        "type": "string",
        "enum": [
          "semantic",
          "numbered"
        ],
        "default": "semantic",
        "description": "Naming convention for split modules (semantic: .core, .api | numbered: .1, .2)"
      },
      "coreModuleSuffix": {
        "type": "string",
        "default": "core",
        "description": "Suffix for core module when splitting (e.g., \"core\", \"base\", \"main\")"
      },
      "extendedModuleSuffix": {
        "type": "string",
        "default": "extended",
        "description": "Suffix for extended module when splitting (e.g., \"extended\", \"api\", \"helpers\")"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-cycle.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-cycle.test.ts)

## OWASP Foundation

- **Category**: A05:2021 - Security Misconfiguration
